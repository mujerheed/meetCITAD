<template>
  <div>
    <PageHeader
      title="Certificate Templates"
      subtitle="Define the visual design and wording used when CITAD certificates are generated."
      icon="mdi-palette-outline"
    >
      <template #actions>
        <v-btn variant="text" to="/certificates" prepend-icon="mdi-arrow-left">Certificates</v-btn>
        <v-btn color="accent" variant="flat" elevation="0" prepend-icon="mdi-plus" @click="openCreate">
          New Template
        </v-btn>
      </template>
    </PageHeader>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-alert type="info" variant="tonal" density="comfortable" class="mb-5" icon="mdi-information-outline">
      The default template is used when no template is selected during certificate
      generation. Placeholders such as
      <span class="mono" v-pre>{{recipientName}}</span>,
      <span class="mono" v-pre>{{eventTitle}}</span>,
      <span class="mono" v-pre>{{eventDate}}</span>, and
      <span class="mono" v-pre>{{eventVenue}}</span>
      are filled automatically.
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, card"></v-skeleton-loader>

    <v-row v-else-if="templates.length" dense>
      <v-col v-for="template in templates" :key="template._id" cols="12" md="6" lg="4">
        <v-card class="admin-card template-card" elevation="0">
          <div
            class="template-preview"
            :style="{
              backgroundColor: template.design?.backgroundColor || '#FFFFFF',
              borderColor: template.design?.border?.color || '#C9A44C',
            }"
          >
            <div class="preview-title">{{ template.content?.title || 'Certificate of Attendance' }}</div>
            <div class="preview-name">Aisha Abdullahi</div>
            <div class="preview-copy">
              has successfully attended a CITAD event.
            </div>
            <div class="preview-footer">CITAD · Kano, Nigeria</div>
          </div>

          <v-card-text class="pa-4">
            <div class="d-flex align-start justify-space-between ga-3">
              <div>
                <div class="font-weight-bold">{{ template.name }}</div>
                <div class="text-caption text-medium-emphasis text-capitalize">
                  {{ template.type }} · {{ template.design?.orientation || 'landscape' }} · {{ template.design?.size || 'A4' }}
                </div>
              </div>
              <v-switch
                :model-value="template.isActive"
                color="primary"
                density="compact"
                hide-details
                :loading="togglingId === template._id"
                :aria-label="`Toggle ${template.name}`"
                @update:model-value="(value) => toggleActive(template, value)"
              ></v-switch>
            </div>

            <div v-if="template.description" class="text-body-2 text-medium-emphasis mt-2">
              {{ template.description }}
            </div>

            <div class="d-flex align-center justify-end ga-1 mt-3">
              <v-chip size="x-small" :color="template.isActive ? 'success' : 'grey'" variant="tonal">
                {{ template.isActive ? 'Active' : 'Inactive' }}
              </v-chip>
              <v-spacer></v-spacer>
              <v-btn icon="mdi-pencil-outline" variant="text" size="small" aria-label="Edit template" @click="openEdit(template)"></v-btn>
              <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" aria-label="Delete template" @click="openDelete(template)"></v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <EmptyState
      v-else-if="!loading"
      icon="mdi-palette-outline"
      title="No certificate templates"
      message="Create a template to control how certificates look and read."
    >
      <template #action>
        <v-btn color="accent" variant="flat" elevation="0" @click="openCreate">Create Template</v-btn>
      </template>
    </EmptyState>

    <!-- Template editor -->
    <v-dialog v-model="editor.show" max-width="820" persistent scrollable>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
          {{ editor.id ? 'Edit template' : 'New certificate template' }}
        </v-card-title>

        <v-card-text class="px-6">
          <v-row dense>
            <v-col cols="12" md="7">
              <v-text-field
                v-model="editor.form.name"
                label="Template name"
                variant="outlined"
                :rules="[(v) => Boolean(v) || 'Name is required']"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="editor.form.type"
                :items="typeOptions"
                label="Certificate type"
                variant="outlined"
                class="mb-2"
              ></v-select>
            </v-col>
          </v-row>

          <v-textarea
            v-model="editor.form.description"
            label="Description"
            variant="outlined"
            rows="2"
            class="mb-4"
          ></v-textarea>

          <div class="form-section-title">Layout</div>
          <div class="form-section-caption mb-3">Paper size, orientation, and border treatment.</div>

          <v-row dense class="mb-4">
            <v-col cols="12" sm="4">
              <v-select
                v-model="editor.form.design.orientation"
                :items="orientationOptions"
                label="Orientation"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="editor.form.design.size"
                :items="sizeOptions"
                label="Paper size"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editor.form.design.backgroundColor"
                label="Background colour"
                variant="outlined"
                placeholder="#FFFFFF"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row dense class="mb-4">
            <v-col cols="12" sm="4">
              <v-switch
                v-model="editor.form.design.border.enabled"
                label="Show border"
                color="primary"
                density="compact"
                hide-details
              ></v-switch>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editor.form.design.border.color"
                label="Border colour"
                variant="outlined"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="editor.form.design.border.width"
                label="Border width (mm)"
                type="number"
                min="0"
                max="10"
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-text-field
            v-model="editor.form.design.backgroundImage"
            label="Background image URL (optional)"
            variant="outlined"
            hint="Use a hosted image URL. Leave blank for a plain background."
            persistent-hint
            class="mb-5"
          ></v-text-field>

          <div class="form-section-title">Certificate wording</div>
          <div class="form-section-caption mb-3">Placeholders are replaced when each certificate is generated.</div>

          <v-text-field
            v-model="editor.form.content.title"
            label="Certificate title"
            variant="outlined"
            class="mb-3"
          ></v-text-field>

          <v-textarea
            v-model="editor.form.content.bodyText"
            label="Body text"
            variant="outlined"
            rows="4"
            class="mb-3"
          ></v-textarea>

          <v-text-field
            v-model="editor.form.content.footerText"
            label="Footer text"
            variant="outlined"
            hint="Optional. For example: CITAD, Kano, Nigeria."
            persistent-hint
          ></v-text-field>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-switch
            v-model="editor.form.isActive"
            label="Active"
            color="primary"
            density="compact"
            hide-details
          ></v-switch>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="editor.saving" @click="editor.show = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="editor.saving" @click="saveTemplate">
            {{ editor.id ? 'Save Changes' : 'Create Template' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this template?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      <strong>{{ deleteDialog.template?.name }}</strong> will be permanently deleted.
      Templates already used by issued certificates cannot be deleted.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const error = ref(null)
const templates = ref([])
const togglingId = ref(null)

const typeOptions = [
  { title: 'Attendance', value: 'attendance' },
  { title: 'Participation', value: 'participation' },
  { title: 'Achievement', value: 'achievement' },
  { title: 'Training', value: 'training' },
  { title: 'Custom', value: 'custom' },
]

const orientationOptions = [
  { title: 'Landscape', value: 'landscape' },
  { title: 'Portrait', value: 'portrait' },
]

const sizeOptions = ['A4', 'Letter', 'Legal'].map((value) => ({ title: value, value }))

const blankForm = () => ({
  name: '',
  description: '',
  type: 'attendance',
  isActive: true,
  design: {
    orientation: 'landscape',
    size: 'A4',
    backgroundColor: '#FFFFFF',
    backgroundImage: '',
    border: {
      enabled: true,
      color: '#C9A44C',
      width: 2,
      style: 'solid',
    },
  },
  content: {
    title: 'Certificate of Attendance',
    bodyText:
      'This is to certify that {{recipientName}} has successfully attended {{eventTitle}} held on {{eventDate}} at {{eventVenue}}.',
    footerText: 'Centre for Information Technology and Development (CITAD)',
  },
})

const editor = reactive({
  show: false,
  id: null,
  original: null,
  saving: false,
  form: blankForm(),
})

const deleteDialog = reactive({ show: false, template: null, loading: false })

const load = async () => {
  loading.value = true
  error.value = null

  try {
    templates.value = await api.certificates.templates()
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load certificate templates.')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editor.id = null
  editor.original = null
  editor.form = blankForm()
  editor.show = true
}

const openEdit = (template) => {
  editor.id = template._id
  editor.original = template
  editor.form = {
    name: template.name || '',
    description: template.description || '',
    type: template.type || 'attendance',
    isActive: template.isActive !== false,
    design: {
      ...(template.design || {}),
      orientation: template.design?.orientation || 'landscape',
      size: template.design?.size || 'A4',
      backgroundColor: template.design?.backgroundColor || '#FFFFFF',
      backgroundImage: template.design?.backgroundImage || '',
      border: {
        enabled: template.design?.border?.enabled !== false,
        color: template.design?.border?.color || '#C9A44C',
        width: template.design?.border?.width ?? 2,
        style: template.design?.border?.style || 'solid',
      },
    },
    content: {
      ...(template.content || {}),
      title: template.content?.title || 'Certificate of Attendance',
      bodyText: template.content?.bodyText || '',
      footerText: template.content?.footerText || '',
    },
  }
  editor.show = true
}

const saveTemplate = async () => {
  if (!editor.form.name.trim()) {
    notifyError('Template name is required.')
    return
  }

  editor.saving = true
  try {
    const payload = {
      name: editor.form.name.trim(),
      description: editor.form.description.trim(),
      type: editor.form.type,
      isActive: editor.form.isActive,
      design: {
        ...editor.form.design,
        backgroundColor: editor.form.design.backgroundColor || '#FFFFFF',
        backgroundImage: editor.form.design.backgroundImage || undefined,
        border: {
          ...editor.form.design.border,
          width: Number(editor.form.design.border.width) || 0,
        },
      },
      content: {
        ...editor.form.content,
        title: editor.form.content.title.trim(),
        bodyText: editor.form.content.bodyText.trim(),
        footerText: editor.form.content.footerText.trim(),
      },
    }

    if (editor.id) {
      await api.certificates.updateTemplate(editor.id, payload)
      notifySuccess('Template updated.')
    } else {
      await api.certificates.createTemplate(payload)
      notifySuccess('Template created.')
    }

    editor.show = false
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not save the template.'))
  } finally {
    editor.saving = false
  }
}

const toggleActive = async (template, value) => {
  togglingId.value = template._id
  try {
    const updated = await api.certificates.updateTemplate(template._id, { isActive: value })
    if (updated) Object.assign(template, updated)
    notifySuccess(`Template ${value ? 'activated' : 'deactivated'}.`)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not update the template.'))
  } finally {
    togglingId.value = null
  }
}

const openDelete = (template) => {
  deleteDialog.template = template
  deleteDialog.show = true
}

const confirmDelete = async () => {
  if (!deleteDialog.template) return
  deleteDialog.loading = true
  try {
    await api.certificates.deleteTemplate(deleteDialog.template._id)
    notifySuccess('Template deleted.')
    deleteDialog.show = false
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the template.'))
  } finally {
    deleteDialog.loading = false
  }
}

onMounted(load)
</script>

<style scoped>
.template-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-preview {
  border: 3px solid #c9a44c;
  border-radius: 2px;
  padding: 16px;
  margin: 16px;
  aspect-ratio: 16 / 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #0f2a44;
  overflow: hidden;
}

.preview-title {
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
}

.preview-name {
  font-family: Georgia, serif;
  font-size: 1rem;
  font-style: italic;
  font-weight: 700;
  border-bottom: 1px solid rgba(15, 42, 68, 0.25);
  padding-bottom: 2px;
  margin-bottom: 5px;
}

.preview-copy {
  font-size: 0.55rem;
  color: #4b5563;
  max-width: 240px;
  line-height: 1.35;
}

.preview-footer {
  margin-top: 10px;
  font-size: 0.5rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}
</style>
