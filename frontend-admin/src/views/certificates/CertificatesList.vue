<template>
  <div>
    <PageHeader
      title="Certificates"
      subtitle="Issue, verify, download, and manage participation certificates across CITAD events."
      icon="mdi-certificate-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-palette-outline" to="/certificates/templates">
          Templates
        </v-btn>
        <v-btn color="accent" variant="flat" elevation="0" prepend-icon="mdi-certificate-outline" @click="openGenerate">
          Generate Certificates
        </v-btn>
      </template>
    </PageHeader>

    <v-row dense class="mb-4">
      <v-col cols="6" md="3">
        <StatCard label="Total issued" :value="formatNumber(stats.total)" caption="All certificate records" icon="mdi-certificate-outline" color="#0F2A44" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Active" :value="formatNumber(stats.active)" caption="Valid and verifiable" icon="mdi-shield-check-outline" color="#059669" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Revoked" :value="formatNumber(stats.revoked)" caption="No longer valid" icon="mdi-shield-off-outline" color="#DC2626" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Downloads" :value="formatNumber(stats.totalDownloads)" caption="Participant downloads" icon="mdi-download-outline" color="#C9A44C" :loading="statsLoading" />
      </v-col>
    </v-row>

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              label="Search certificates"
              placeholder="Recipient, email, or number"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.eventId"
              :items="eventOptions"
              label="Event"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2" class="d-flex justify-md-end align-center">
            <v-btn icon="mdi-refresh" variant="text" :loading="loading" @click="load"></v-btn>
            <v-chip variant="tonal" color="primary" size="small">
              {{ pagination.total }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-card class="admin-card" elevation="0">
      <v-table v-if="loading || certificates.length" class="admin-table" hover>
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Event</th>
            <th>Certificate number</th>
            <th>Issued</th>
            <th>Downloads</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="index in 6" :key="index">
              <td colspan="7"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
            </tr>
          </template>

          <template v-else>
            <tr v-for="certificate in certificates" :key="certificate._id">
              <td style="min-width: 190px">
                <div class="font-weight-medium">{{ certificate.recipientName || certificate.userId?.fullname }}</div>
                <div class="text-caption text-medium-emphasis">{{ certificate.recipientEmail || certificate.userId?.email }}</div>
              </td>
              <td style="min-width: 190px">
                <div class="text-body-2">{{ certificate.eventId?.title || '—' }}</div>
                <div class="text-caption text-medium-emphasis">{{ formatDate(certificate.eventId?.startDateTime) }}</div>
              </td>
              <td class="mono">{{ certificate.certificateNumber }}</td>
              <td>{{ formatDate(certificate.issuedDate) }}</td>
              <td>{{ certificate.downloadCount || 0 }}</td>
              <td><StatusChip :status="certificate.status" /></td>
              <td class="text-right">
                <v-btn
                  icon="mdi-download"
                  variant="text"
                  size="small"
                  aria-label="Download certificate"
                  :disabled="certificate.status === 'revoked'"
                  @click="downloadCertificate(certificate)"
                ></v-btn>
                <v-btn
                  icon="mdi-open-in-new"
                  variant="text"
                  size="small"
                  aria-label="Verify certificate"
                  :href="verifyUrl(certificate)"
                  target="_blank"
                  rel="noopener"
                ></v-btn>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" aria-label="Certificate actions"></v-btn>
                  </template>
                  <v-list density="compact" min-width="190">
                    <v-list-item
                      prepend-icon="mdi-refresh"
                      title="Regenerate"
                      :disabled="certificate.status === 'revoked'"
                      @click="regenerateCertificate(certificate)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-shield-off-outline"
                      title="Revoke certificate"
                      :disabled="certificate.status === 'revoked'"
                      @click="openRevoke(certificate)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>

      <EmptyState
        v-else
        icon="mdi-certificate-outline"
        title="No certificates found"
        message="Generate certificates for an event or adjust the filters."
      >
        <template #action>
          <v-btn color="accent" variant="flat" elevation="0" @click="openGenerate">Generate Certificates</v-btn>
        </template>
      </EmptyState>

      <v-divider v-if="pagination.totalPages > 1"></v-divider>
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center py-4">
        <v-pagination
          v-model="filters.page"
          :length="pagination.totalPages"
          :total-visible="6"
          density="comfortable"
          @update:model-value="load"
        ></v-pagination>
      </div>
    </v-card>

    <!-- Generate dialog -->
    <v-dialog v-model="generateDialog.show" max-width="520" persistent>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
          Generate certificates
        </v-card-title>
        <v-card-text class="px-6">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Certificates are generated for attendees who checked in and do not
            already have a certificate for the event.
          </p>

          <NativeSelect
            v-model="generateDialog.eventId"
            :items="eventOptions"
            label="Event"
            placeholder="Select an event"
            class="mb-3"
          />

          <NativeSelect
            v-model="generateDialog.templateId"
            :items="templateOptions"
            label="Template"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="generateDialog.loading" @click="generateDialog.show = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="generateDialog.loading"
            :disabled="!generateDialog.eventId"
            @click="generateCertificates"
          >
            Generate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="revokeDialog.show"
      title="Revoke certificate?"
      confirm-text="Revoke"
      color="error"
      :loading="revokeDialog.loading"
      @confirm="confirmRevoke"
    >
      <p class="mb-3">
        Certificate <strong>{{ revokeDialog.certificate?.certificateNumber }}</strong>
        will no longer verify as valid.
      </p>
      <v-textarea
        v-model="revokeDialog.reason"
        label="Reason for revocation"
        variant="outlined"
        rows="2"
        hide-details
      ></v-textarea>
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import NativeSelect from '@/components/NativeSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate } from '@/utils/formatters'
import { downloadBlob } from '@/utils/download'

const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const statsLoading = ref(true)
const error = ref(null)
const certificates = ref([])
const events = ref([])
const templates = ref([])
const stats = ref({})
const pagination = reactive({ total: 0, totalPages: 1 })

const filters = reactive({
  search: '',
  eventId: null,
  status: 'all',
  page: 1,
  limit: 20,
})

const statusOptions = [
  { title: 'All statuses', value: 'all' },
  { title: 'Active', value: 'active' },
  { title: 'Revoked', value: 'revoked' },
  { title: 'Expired', value: 'expired' },
]

const generateDialog = reactive({
  show: false,
  eventId: null,
  templateId: '',
  loading: false,
})

const revokeDialog = reactive({
  show: false,
  certificate: null,
  reason: '',
  loading: false,
})

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const publicSiteUrl =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin)

const eventOptions = computed(() =>
  events.value.map((event) => ({
    title: `${event.title} — ${formatDate(event.startDate)}`,
    value: event._id,
  }))
)

const templateOptions = computed(() => [
  { title: 'Default template', value: '' },
  ...templates.value.map((template) => ({
    title: `${template.name}${template.isActive ? '' : ' (inactive)'}`,
    value: template._id,
  })),
])

const verifyUrl = (certificate) =>
  certificate.verificationHash
    ? `${String(publicSiteUrl).replace(/\/$/, '')}/verify/${certificate.verificationHash}`
    : '#'

const loadOptions = async () => {
  try {
    const [eventResult, templateResult] = await Promise.all([
      api.events.list({ limit: 100, sort: '-startDateTime' }),
      api.certificates.templates(),
    ])
    events.value = eventResult.events || []
    templates.value = templateResult || []
  } catch {
    // Filters remain usable without options.
  }
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    stats.value = await api.certificates.statistics(
      filters.eventId ? { eventId: filters.eventId } : {}
    )
  } catch {
    stats.value = {}
  } finally {
    statsLoading.value = false
  }
}

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const params = { page: filters.page, limit: filters.limit }
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.eventId) params.eventId = filters.eventId
    if (filters.status !== 'all') params.status = filters.status

    const result = await api.certificates.list(params)
    certificates.value = result.certificates || []
    pagination.total = result.pagination.total
    pagination.totalPages = result.pagination.totalPages
    loadStats()
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load certificates.')
  } finally {
    loading.value = false
  }
}

let searchTimer
watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      filters.page = 1
      load()
    }, 350)
  }
)

watch(
  () => [filters.eventId, filters.status],
  () => {
    filters.page = 1
    load()
  }
)

const openGenerate = () => {
  generateDialog.eventId = filters.eventId || null
  generateDialog.templateId = ''
  generateDialog.show = true
}

const generateCertificates = async () => {
  if (!generateDialog.eventId) return
  generateDialog.loading = true

  try {
    const result = await api.certificates.bulkGenerate(
      generateDialog.eventId,
      generateDialog.templateId || undefined
    )
    notifySuccess(result.message || 'Certificate generation completed.')
    generateDialog.show = false
    filters.eventId = generateDialog.eventId
    filters.page = 1
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not generate certificates.'))
  } finally {
    generateDialog.loading = false
  }
}

const downloadCertificate = async (certificate) => {
  try {
    const response = await api.certificates.download(certificate._id)
    downloadBlob(response.data, `${certificate.certificateNumber || 'certificate'}.pdf`)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not download the certificate.'))
  }
}

const regenerateCertificate = async (certificate) => {
  try {
    await api.certificates.regenerate(certificate._id)
    notifySuccess('Certificate regenerated.')
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not regenerate the certificate.'))
  }
}

const openRevoke = (certificate) => {
  revokeDialog.certificate = certificate
  revokeDialog.reason = ''
  revokeDialog.show = true
}

const confirmRevoke = async () => {
  if (!revokeDialog.certificate) return
  revokeDialog.loading = true
  try {
    await api.certificates.revoke(revokeDialog.certificate._id, revokeDialog.reason)
    notifySuccess('Certificate revoked.')
    revokeDialog.show = false
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not revoke the certificate.'))
  } finally {
    revokeDialog.loading = false
  }
}

onMounted(async () => {
  await loadOptions()
  await load()
})
</script>
