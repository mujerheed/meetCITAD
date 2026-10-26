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
            :class="{ 'has-uploaded-design': Boolean(template.design?.backgroundImage) }"
            :style="{
              backgroundColor: template.design?.backgroundColor || '#FFFFFF',
              borderColor: template.design?.border?.color || '#0E4F8B',
              backgroundImage: template.design?.backgroundImage
                ? `url('${resolveMediaUrl(template.design.backgroundImage)}')`
                : undefined,
            }"
          >
            <template v-if="template.design?.backgroundImage">
              <span class="uploaded-design-label">Uploaded design</span>
            </template>
            <template v-else>
              <img :src="citadLogo" alt="CITAD" class="preview-logo" />
              <div class="preview-title">{{ template.content?.title || 'Certificate of Attendance' }}</div>
              <div class="preview-name">Aisha Abdullahi</div>
              <div class="preview-copy">
                has successfully attended a CITAD event.
              </div>
              <div class="preview-footer">CITAD · Kano, Nigeria</div>
            </template>
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
              <NativeSelect
                v-model="editor.form.type"
                :items="typeOptions"
                label="Certificate type"
                class="mb-2"
              />
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
              <NativeSelect
                v-model="editor.form.design.orientation"
                :items="orientationOptions"
                label="Orientation"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <NativeSelect
                v-model="editor.form.design.size"
                :items="sizeOptions"
                label="Paper size"
              />
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

          <div class="form-section-title">Uploaded certificate design</div>
          <div class="form-section-caption mb-3">
            Upload an already-designed CITAD certificate. It becomes the full-page
            background, and the recipient name, event statement, certificate number,
            and verification QR are placed on top. A4 landscape PNG, JPG, or WebP is
            recommended.
          </div>

          <v-file-input
            v-model="editor.file"
            label="Certificate design image"
            accept="image/png,image/jpeg,image/webp"
            prepend-icon="mdi-upload"
            variant="outlined"
            density="comfortable"
            :rules="[designFileRule]"
            hint="PNG, JPG, or WebP up to 10 MB."
            persistent-hint
            class="mb-3"
            @update:model-value="onDesignFileChange"
          ></v-file-input>

          <div v-if="editor.previewUrl" class="design-preview-card mb-4">
            <v-img
              :src="editor.previewUrl"
              alt="Uploaded certificate design preview"
              max-height="260"
              contain
              class="design-preview-image"
            ></v-img>
            <div class="design-preview-meta">
              <span class="text-caption text-medium-emphasis">
                {{ editor.file ? 'New design selected — save to apply.' : 'Current uploaded design.' }}
              </span>
              <v-btn
                variant="text"
                color="error"
                size="small"
                :loading="editor.removing"
                @click="removeDesign"
              >
                {{ editor.file ? 'Clear selection' : 'Remove design' }}
              </v-btn>
            </div>
          </div>

          <template v-if="editor.previewUrl">
            <div class="form-section-title">Uploaded design fields</div>
            <div class="form-section-caption mb-3">
              Adjust where the overlaid text and QR appear. Positions are measured
              from the top of the page in millimetres.
            </div>

            <v-row dense class="mb-4">
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editor.form.design.layout.recipientName.y"
                  label="Recipient name position (mm)"
                  type="number"
                  min="20"
                  max="190"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editor.form.design.layout.body.y"
                  label="Statement position (mm)"
                  type="number"
                  min="30"
                  max="195"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editor.form.design.layout.qrCode.size"
                  label="QR code size (mm)"
                  type="number"
                  min="10"
                  max="35"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>
          </template>

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
          <v-btn variant="text" :disabled="editor.saving" @click="closeEditor">Cancel</v-btn>
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
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import NativeSelect from '@/components/NativeSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { resolveMediaUrl } from '@/utils/normalizers'
import citadLogo from '@/assets/images/citad-logo-transparent.png'

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
      color: '#0E4F8B',
      width: 1.6,
      style: 'solid',
    },
    layout: {
      recipientName: { y: 92 },
      body: { y: 122 },
      qrCode: { size: 16 },
    },
  },
  content: {
    title: 'Certificate of Attendance',
    bodyText: 'has attended {{eventTitle}} held at {{eventVenue}}.',
    footerText:
      'Centre for Information Technology and Development (CITAD), Kano, Nigeria',
  },
})

const editor = reactive({
  show: false,
  id: null,
  original: null,
  saving: false,
  file: null,
  previewUrl: '',
  savedBackground: '',
  objectUrl: '',
  removing: false,
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

const revokeObjectUrl = () => {
  if (editor.objectUrl) {
    URL.revokeObjectURL(editor.objectUrl)
    editor.objectUrl = ''
  }
}

const resetDesignState = (background = '') => {
  revokeObjectUrl()
  editor.file = null
  editor.savedBackground = background || ''
  editor.previewUrl = background ? resolveMediaUrl(background) : ''
}

const supportedDesignTypes = ['image/png', 'image/jpeg', 'image/webp']

const designFileRule = (value) => {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return true
  if (!supportedDesignTypes.includes(file.type)) {
    return 'Upload a PNG, JPG, or WebP image.'
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'The design must be 10 MB or smaller.'
  }
  return true
}

const onDesignFileChange = (value) => {
  const file = Array.isArray(value) ? value[0] : value
  revokeObjectUrl()

  const validation = designFileRule(file)
  if (!file || validation !== true) {
    if (validation !== true) notifyError(validation)
    editor.file = null
    editor.previewUrl = editor.savedBackground
      ? resolveMediaUrl(editor.savedBackground)
      : ''
    return
  }

  editor.file = file
  editor.objectUrl = URL.createObjectURL(file)
  editor.previewUrl = editor.objectUrl
}

const openCreate = () => {
  editor.id = null
  editor.original = null
  editor.form = blankForm()
  resetDesignState('')
  editor.show = true
}

const openEdit = (template) => {
  const savedLayout = template.design?.layout || {}

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
        color: template.design?.border?.color || '#0E4F8B',
        width: template.design?.border?.width ?? 1.6,
        style: template.design?.border?.style || 'solid',
      },
      layout: {
        ...savedLayout,
        recipientName: {
          ...(savedLayout.recipientName || {}),
          y: savedLayout.recipientName?.y ?? 92,
        },
        body: {
          ...(savedLayout.body || {}),
          y: savedLayout.body?.y ?? 122,
        },
        qrCode: {
          ...(savedLayout.qrCode || {}),
          size: savedLayout.qrCode?.size ?? 16,
        },
      },
    },
    content: {
      ...(template.content || {}),
      title: template.content?.title || 'Certificate of Attendance',
      bodyText: template.content?.bodyText || '',
      footerText: template.content?.footerText || '',
    },
  }
  resetDesignState(template.design?.backgroundImage || '')
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

    let saved
    if (editor.id) {
      saved = await api.certificates.updateTemplate(editor.id, payload)
    } else {
      saved = await api.certificates.createTemplate(payload)
    }

    if (editor.file && saved?._id) {
      try {
        saved = await api.certificates.uploadTemplateBackground(saved._id, editor.file)
      } catch (uploadError) {
        editor.id = saved._id
        editor.savedBackground = saved.design?.backgroundImage || editor.savedBackground
        await load()
        notifyError(
          getErrorMessage(
            uploadError,
            'Template details were saved, but the design upload failed. Try saving again.'
          )
        )
        return
      }
    }

    notifySuccess(
      editor.file
        ? editor.id
          ? 'Template and uploaded design updated.'
          : 'Template created with uploaded design.'
        : editor.id
          ? 'Template updated.'
          : 'Template created.'
    )

    editor.show = false
    resetDesignState('')
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not save the template.'))
  } finally {
    editor.saving = false
  }
}

const removeDesign = async () => {
  // Clearing an unsaved replacement must not delete the previously saved design.
  if (editor.file) {
    resetDesignState(editor.savedBackground)
    return
  }

  if (!editor.id) {
    editor.form.design.backgroundImage = ''
    resetDesignState('')
    return
  }

  editor.removing = true
  try {
    await api.certificates.removeTemplateBackground(editor.id)
    editor.form.design.backgroundImage = ''
    resetDesignState('')
    notifySuccess('Uploaded certificate design removed.')
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not remove the uploaded design.'))
  } finally {
    editor.removing = false
  }
}

const closeEditor = () => {
  editor.show = false
  resetDesignState('')
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
onBeforeUnmount(revokeObjectUrl)
</script>

<style scoped>
.template-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-preview {
  position: relative;
  border: 3px solid #0e4f8b;
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

.template-preview::before {
  content: 'CITAD';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Georgia, serif;
  font-size: 4.2rem;
  font-weight: 700;
  color: rgba(14, 79, 139, 0.06);
  pointer-events: none;
}

.template-preview.has-uploaded-design {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.template-preview.has-uploaded-design::before {
  content: '';
}

.uploaded-design-label {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 42, 68, 0.78);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.design-preview-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}

.design-preview-image {
  background: #fff;
}

.design-preview-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid rgba(15, 42, 68, 0.12);
}

.preview-logo {
  position: relative;
  z-index: 1;
  height: 22px;
  width: auto;
  margin-bottom: 8px;
}

.preview-title,
.preview-name,
.preview-copy,
.preview-footer {
  position: relative;
  z-index: 1;
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
