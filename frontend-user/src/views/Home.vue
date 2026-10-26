<template>
  <div class="home-page">
    <!-- Public landing carousel -->
    <section class="hero-carousel-section">
      <v-carousel
        v-model="activeSlide"
        :height="carouselHeight"
        :cycle="heroSlides.length > 1"
        :interval="7000"
        :show-arrows="!mdAndDown && heroSlides.length > 1"
        hide-delimiters
        class="hero-carousel"
      >
        <v-carousel-item
          v-for="(slide, index) in heroSlides"
          :key="slide.id || index"
        >
          <div class="hero-slide" :style="heroSlideStyle(slide)">
            <v-container class="hero-slide-content h-100 d-flex align-center">
              <div class="hero-copy">
                <div class="hero-eyebrow">
                  <span class="hero-eyebrow-line"></span>
                  {{ slide.eyebrow }}
                </div>
                <h1 class="hero-title">{{ slide.title }}</h1>
                <p class="hero-subtitle">{{ slide.subtitle }}</p>

                <div v-if="slide.meta?.length" class="hero-meta">
                  <span v-for="item in slide.meta" :key="item.text">
                    <v-icon size="17">{{ item.icon }}</v-icon>
                    {{ item.text }}
                  </span>
                </div>

                <div class="hero-actions">
                  <v-btn
                    color="accent"
                    size="large"
                    class="hero-primary-btn"
                    :to="slide.primaryTo"
                  >
                    {{ slide.primaryLabel }}
                  </v-btn>
                  <v-btn
                    v-if="slide.secondaryTo"
                    variant="outlined"
                    color="white"
                    size="large"
                    :to="slide.secondaryTo"
                    class="hero-secondary-btn"
                  >
                    {{ slide.secondaryLabel }}
                  </v-btn>
                </div>

                <p class="hero-guest-note">
                  <v-icon size="16">mdi-lock-open-check</v-icon>
                  Browse freely. Sign in or create an account when you're ready to register.
                </p>
              </div>
            </v-container>
          </div>
        </v-carousel-item>
      </v-carousel>

      <div v-if="heroSlides.length > 1" class="hero-pagination">
        <span class="hero-pagination-count">
          {{ String(activeSlide + 1).padStart(2, '0') }}
          <span class="hero-pagination-total">/ {{ String(heroSlides.length).padStart(2, '0') }}</span>
        </span>
        <div class="hero-pagination-dots">
          <button
            v-for="(slide, index) in heroSlides"
            :key="slide.id || index"
            type="button"
            class="hero-dot"
            :class="{ active: activeSlide === index }"
            :aria-label="`Show slide ${index + 1}`"
            @click="activeSlide = index"
          ></button>
        </div>
      </div>
    </section>

    <!-- Attendance workflow, not unsupported institutional statistics -->
    <section class="participation-section" aria-label="How meetCITAD works">
      <v-container>
        <v-row class="participation-row">
          <v-col
            v-for="step in participationSteps"
            :key="step.title"
            cols="6"
            md="3"
            class="participation-col"
          >
            <div class="participation-item">
              <v-icon size="30" color="accent" class="participation-icon">{{ step.icon }}</v-icon>
              <div class="participation-copy">
                <h2 class="participation-title">{{ step.title }}</h2>
                <p class="participation-label">{{ step.description }}</p>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Upcoming events -->
    <section class="events-section">
      <v-container class="py-16">
        <div class="section-heading">
          <div>
            <p class="section-eyebrow">What's next</p>
            <h2 class="section-title">Upcoming events</h2>
            <p class="section-subtitle">
              Explore CITAD's programmes, workshops, and training sessions.
            </p>
          </div>
          <v-btn
            to="/events"
            variant="text"
            color="primary"
            append-icon="mdi-arrow-right"
            class="section-link"
          >
            View all events
          </v-btn>
        </div>

        <v-row v-if="upcomingEvents.length > 0" class="mt-2">
          <v-col
            v-for="event in upcomingEvents.slice(0, 3)"
            :key="event._id"
            cols="12"
            sm="6"
            md="4"
            class="event-col"
          >
            <v-card class="event-card h-100" elevation="0">
              <div class="event-media">
                <v-img :src="event.banner" :alt="event.title" height="210" cover>
                  <template #placeholder>
                    <div class="event-media-placeholder">
                      <v-progress-circular indeterminate color="accent" size="28" />
                    </div>
                  </template>
                </v-img>
                <span v-if="event.category" class="event-category">{{ event.category }}</span>
              </div>

              <div class="event-card-body">
                <div class="event-date">
                  <v-icon size="15">mdi-calendar-outline</v-icon>
                  {{ formatDate(event.startDate) }}
                  <span v-if="event.startTime" class="event-time">· {{ event.startTime }}</span>
                </div>
                <h3 class="event-title">{{ event.title }}</h3>
                <p class="event-summary">{{ eventSummary(event, 200) }}</p>
                <div class="event-venue">
                  <v-icon size="15">mdi-map-marker-outline</v-icon>
                  {{ event.venueName || event.location }}
                </div>

                <v-btn
                  color="accent"
                  variant="flat"
                  :to="`/events/${event._id}`"
                  block
                  elevation="0"
                  class="event-cta"
                >
                  View &amp; register
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-else-if="!loading">
          <v-col cols="12" class="text-center py-12">
            <v-icon size="58" color="accent" class="mb-4">mdi-calendar-blank-outline</v-icon>
            <h3 class="text-h6 mb-2">No upcoming events at the moment</h3>
            <p class="text-body-2 text-medium-emphasis mb-6">
              Check back soon for new programmes and workshops from CITAD.
            </p>
            <v-btn variant="outlined" color="primary" to="/events">Browse events</v-btn>
          </v-col>
        </v-row>

        <v-row v-if="loading" class="my-12">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" size="56" />
          </v-col>
        </v-row>

        <div v-if="!loading && upcomingEvents.length > 3" class="events-footer">
          <v-btn
            to="/events"
            variant="outlined"
            color="primary"
            append-icon="mdi-arrow-right"
            class="events-footer-btn"
          >
            View all events
          </v-btn>
        </div>
      </v-container>
    </section>

    <!-- Account call-to-action -->
    <section v-if="!isAuthenticated" class="member-cta-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="8">
            <p class="section-eyebrow mb-2">Join the community</p>
            <h2 class="section-title mb-3">Ready to attend a CITAD event?</h2>
            <p class="section-subtitle mb-0">
              Create a participant account to register for events, keep your QR
              tickets in one place, and access verified certificates.
            </p>
          </v-col>
          <v-col cols="12" md="4" class="d-flex justify-md-end justify-center">
            <v-btn color="accent" size="large" to="/signup" class="member-cta-btn">
              Create account
            </v-btn>
            <v-btn variant="outlined" size="large" to="/login" class="ml-3 member-cta-btn">
              Sign in
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- About CITAD preview -->
    <section class="about-section">
      <v-container class="py-16">
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <p class="section-eyebrow">About the organisation</p>
            <h2 class="section-title mb-6">{{ citad.name }}</h2>
            <p class="about-copy mb-8">
              CITAD is a non-governmental and non-profit organization committed to
              using information and communication technologies for development and
              the promotion of good governance. Since {{ citad.established }}, its work has connected
              technology, knowledge, and civic engagement across Nigeria.
            </p>
            <v-btn
              to="/about"
              variant="outlined"
              color="primary"
              append-icon="mdi-arrow-right"
            >
              Learn more about CITAD
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useEventStore } from '@/stores/event'
import { formatDate, truncate } from '@/utils/formatters'
import { citad } from '@/utils/citad'
import heroOne from '@/assets/images/hero-1.jpg'
import heroTwo from '@/assets/images/hero-2.jpg'
import heroThree from '@/assets/images/hero-3.jpg'

const authStore = useAuthStore()
const eventStore = useEventStore()
const { mdAndDown } = useDisplay()

const activeSlide = ref(0)
const participationSteps = [
  { icon: 'mdi-calendar-search', title: 'Discover', description: 'Browse CITAD events' },
  { icon: 'mdi-ticket-confirmation-outline', title: 'Register', description: 'Keep your QR ticket' },
  { icon: 'mdi-qrcode-scan', title: 'Check in', description: 'Record your attendance' },
  { icon: 'mdi-certificate-outline', title: 'Certificates', description: 'Download when issued' },
]
const isAuthenticated = computed(() => authStore.isAuthenticated)
const upcomingEvents = computed(() => eventStore.upcomingEvents || [])
const loading = computed(() => eventStore.loading)
const carouselEvents = computed(() =>
  upcomingEvents.value.filter((event) => event._id).slice(0, 5)
)
const carouselHeight = computed(() => (mdAndDown.value ? 610 : 620))

const staticSlides = computed(() => [
  {
    id: 'welcome',
    eyebrow: citad.name,
    title: 'Empowering communities through technology, knowledge, and civic engagement',
    subtitle:
      'Register for CITAD programmes, attend events, and receive verified certificates through our digital event management system.',
    image: heroOne,
    meta: [
      { icon: 'mdi-calendar-start', text: `Established ${citad.established}` },
      { icon: 'mdi-map-marker-outline', text: 'Kano, Nigeria' },
      { icon: 'mdi-account-group-outline', text: 'Community-focused' },
    ],
    primaryLabel: 'View upcoming events',
    primaryTo: '/events',
    secondaryLabel: 'About CITAD',
    secondaryTo: '/about',
  },
  {
    id: 'learning',
    eyebrow: 'Learn and connect',
    title: 'Practical programmes for a digital, informed society',
    subtitle:
      'From digital literacy workshops to civic technology training, CITAD brings people together to build skills and share knowledge.',
    image: heroTwo,
    meta: [
      { icon: 'mdi-school-outline', text: 'Skills and training' },
      { icon: 'mdi-account-voice', text: 'Civic engagement' },
    ],
    primaryLabel: 'Explore events',
    primaryTo: '/events',
    secondaryLabel: 'About CITAD',
    secondaryTo: '/about',
  },
  {
    id: 'certificates',
    eyebrow: 'Verified participation',
    title: 'Your attendance and certificates, in one place',
    subtitle:
      'Register, keep your QR ticket, check in at the venue, and download your verified certificate after the event.',
    image: heroThree,
    meta: [
      { icon: 'mdi-qrcode-scan', text: 'QR check-in' },
      { icon: 'mdi-certificate-outline', text: 'Verified certificates' },
    ],
    primaryLabel: isAuthenticated.value ? 'Go to dashboard' : 'Create an account',
    primaryTo: isAuthenticated.value ? '/dashboard' : '/signup',
    secondaryLabel: 'Verify a certificate',
    secondaryTo: '/verify',
  },
])

const eventSlides = computed(() =>
  carouselEvents.value.map((event) => ({
    id: event._id,
    eyebrow: 'Featured CITAD event',
    title: event.title,
    subtitle: eventSummary(event),
    image: event.banner || event.bannerImage,
    meta: [
      {
        icon: 'mdi-calendar-outline',
        text: formatDate(event.startDate, { weekday: 'short' }),
      },
      ...(event.startTime
        ? [{ icon: 'mdi-clock-outline', text: event.startTime }]
        : []),
      {
        icon: 'mdi-map-marker-outline',
        text: event.venueName || event.location,
      },
    ],
    primaryLabel: 'View event & register',
    primaryTo: `/events/${event._id}`,
    secondaryLabel: 'Browse all events',
    secondaryTo: '/events',
  }))
)

const heroSlides = computed(() =>
  eventSlides.value.length ? eventSlides.value : staticSlides.value
)

watch(
  () => heroSlides.value.length,
  (length) => {
    if (activeSlide.value >= length) activeSlide.value = 0
  }
)

const eventSummary = (event, maxLength = 185) =>
  truncate(
    event.shortDescription ||
      event.description ||
      'Join CITAD for an upcoming programme, workshop, or training session.',
    maxLength
  )

const heroSlideStyle = (slide) => {
  const image = slide.image
  return {
    backgroundImage: image
      ? `linear-gradient(90deg, rgba(8, 24, 40, 0.95) 0%, rgba(8, 24, 40, 0.82) 48%, rgba(8, 24, 40, 0.32) 100%), url("${image}")`
      : 'linear-gradient(120deg, #0f2a44 0%, #173c5e 100%)',
  }
}

onMounted(async () => {
  try {
    await eventStore.fetchEvents({ limit: 9, status: 'upcoming' })
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }
})
</script>

<style scoped>
/* ---------------------------------------------------- Shared */
.home-page {
  background: rgb(var(--v-theme-background));
}

.section-eyebrow {
  color: #c9a44c;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.section-title {
  color: rgb(var(--v-theme-on-background));
  font-size: clamp(1.55rem, 3vw, 2.1rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.section-subtitle {
  max-width: 620px;
  margin-top: 10px;
  color: rgba(var(--v-theme-on-background), 0.68);
  font-size: 0.98rem;
  line-height: 1.7;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.section-link {
  flex: 0 0 auto;
  text-transform: none;
  font-weight: 600;
}

/* ---------------------------------------------------- Carousel */
.hero-carousel-section {
  position: relative;
  background: #0f2a44;
}

.hero-carousel {
  background: #0f2a44;
}

.hero-slide {
  position: relative;
  height: 100%;
  background-position: center;
  background-size: cover;
}

.hero-slide::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 24, 40, 0.1) 0%, rgba(8, 24, 40, 0.28) 100%);
  content: '';
  pointer-events: none;
}

.hero-slide-content {
  position: relative;
  z-index: 2;
  max-width: 1280px;
  height: 100%;
}

.hero-copy {
  max-width: 690px;
  color: #ffffff;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: #e3c77c;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-eyebrow-line {
  width: 28px;
  height: 1px;
  background: #c9a44c;
}

.hero-title {
  max-width: 680px;
  color: #ffffff;
  font-size: clamp(2rem, 4.6vw, 3.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.12;
  text-wrap: balance;
}

.hero-subtitle {
  max-width: 590px;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 1.02rem;
  line-height: 1.75;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.86rem;
}

.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.hero-meta .v-icon {
  color: #d8b766;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.hero-primary-btn,
.hero-secondary-btn {
  min-height: 46px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.hero-primary-btn {
  color: #0f2a44 !important;
}

.hero-secondary-btn {
  border-color: rgba(255, 255, 255, 0.55);
}

.hero-secondary-btn:hover {
  border-color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.hero-guest-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 22px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.76rem;
}

.hero-pagination {
  position: absolute;
  right: max(24px, calc((100vw - 1280px) / 2));
  bottom: 26px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 18px;
}

.hero-pagination-count {
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero-pagination-total {
  color: rgba(255, 255, 255, 0.45);
}

.hero-pagination-dots {
  display: flex;
  align-items: center;
  gap: 7px;
}

.hero-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.34);
  cursor: pointer;
  transition: background 0.2s ease, width 0.2s ease;
}

.hero-dot.active {
  width: 22px;
  border-radius: 4px;
  background: #c9a44c;
}

.hero-pagination :deep(.v-btn) {
  color: #ffffff;
}

/* ---------------------------------------------------- Static hero */
.hero-section {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 520px;
  padding: 80px 0;
  background:
    linear-gradient(90deg, rgba(8, 24, 40, 0.97) 0%, rgba(8, 24, 40, 0.88) 52%, rgba(8, 24, 40, 0.62) 100%),
    url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600') center/cover;
  color: #ffffff;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 1280px;
}

/* ---------------------------------------------------- Attendance workflow */
.participation-section {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.participation-row {
  padding: 0;
}

.participation-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.participation-col:last-child {
  border-right: 0;
}

.participation-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  padding: 28px 20px;
}

.participation-icon {
  flex: 0 0 auto;
  color: #b38b34 !important;
}

.participation-copy {
  min-width: 0;
  text-align: left;
}

.participation-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: clamp(1rem, 1.8vw, 1.2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.participation-label {
  margin-top: 6px;
  margin-bottom: 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.76rem;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

/* ---------------------------------------------------- Events */
.events-section {
  background: rgb(var(--v-theme-background));
}

.event-col {
  display: flex;
}

.event-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(15, 42, 68, 0.05);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.event-card:hover {
  border-color: rgba(201, 164, 76, 0.8);
  box-shadow: 0 18px 36px rgba(15, 42, 68, 0.12);
  transform: translateY(-3px);
}

.event-media {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
}

.event-media-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.event-category {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 5px 10px;
  border-radius: 3px;
  background: #c9a44c;
  color: #0f2a44;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.event-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: auto;
  padding: 22px;
}

.event-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a47f2f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.event-time {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-weight: 500;
}

.event-title {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-summary {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10px;
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.86rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.event-venue {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 0 20px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.78rem;
}

.event-cta {
  flex: 0 0 auto;
  margin-top: auto;
  border-radius: 4px;
  color: #0f2a44 !important;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.events-footer {
  display: flex;
  justify-content: center;
  margin-top: 36px;
}

.events-footer-btn {
  min-width: 220px;
  min-height: 46px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* ---------------------------------------------------- Member CTA */
.member-cta-section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    linear-gradient(90deg, rgba(15, 42, 68, 0.05), rgba(201, 164, 76, 0.1)),
    rgb(var(--v-theme-surface));
}

.member-cta-section .section-subtitle {
  max-width: 640px;
}

.member-cta-btn {
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.member-cta-section .v-btn.v-btn--variant-outlined {
  border-color: rgba(var(--v-theme-on-surface), 0.28);
  color: rgb(var(--v-theme-on-surface));
}

/* ---------------------------------------------------- About */
.about-section {
  background: rgb(var(--v-theme-background));
}

.about-copy {
  max-width: 760px;
  margin-inline: auto;
  color: rgba(var(--v-theme-on-background), 0.7);
  font-size: 1rem;
  line-height: 1.85;
}

/* ---------------------------------------------------- Responsive */
@media (max-width: 960px) {
  .hero-title {
    font-size: 2.15rem;
  }

  .hero-copy {
    max-width: 100%;
  }

  .hero-slide::after {
    background: linear-gradient(180deg, rgba(8, 24, 40, 0.24) 0%, rgba(8, 24, 40, 0.56) 100%);
  }

  .participation-item {
    gap: 10px;
    padding: 24px 14px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .participation-col:nth-child(2) {
    border-right: 0;
  }

  .participation-col:nth-child(-n + 2) {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .member-cta-section .v-col:last-child {
    justify-content: flex-start !important;
  }
}

@media (max-width: 600px) {
  .hero-section {
    min-height: 0;
    padding: 64px 0 72px;
  }

  .hero-title {
    font-size: 1.9rem;
  }

  .hero-subtitle {
    font-size: 0.96rem;
  }

  .hero-meta {
    gap: 8px 16px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions .v-btn {
    width: 100%;
  }

  .hero-pagination {
    right: 18px;
    bottom: 18px;
  }

  .hero-guest-note {
    align-items: flex-start;
    line-height: 1.5;
  }

  .participation-col {
    border-right: 0 !important;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .participation-col:nth-child(3),
  .participation-col:nth-child(4) {
    border-bottom: 0;
  }

  .participation-item {
    justify-content: flex-start;
    padding: 20px 12px;
  }

  .participation-title {
    font-size: 1rem;
  }

  .participation-label {
    font-size: 0.72rem;
  }

  .events-footer {
    margin-top: 28px;
  }

  .events-footer-btn {
    width: 100%;
    max-width: 300px;
  }

  .event-card-body {
    height: auto;
  }

  .member-cta-section .v-col:last-child {
    flex-wrap: wrap;
    gap: 10px;
  }

  .member-cta-btn {
    flex: 1 1 auto;
  }

  .member-cta-btn.ml-3 {
    margin-left: 0 !important;
  }
}
</style>
