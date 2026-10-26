<template>
  <div class="about-page">
    <!-- Page hero -->
    <section class="about-hero" :style="{ '--about-hero-image': `url(${aboutHero})` }">
      <v-container class="about-hero-inner">
        <div class="about-hero-copy">
          <p class="about-eyebrow">About CITAD</p>
          <h1 class="about-title">
            {{ citad.name }}
          </h1>
          <p class="about-lead">
            A non-governmental, non-profit organisation using information and
            communication technologies for development, good governance, and
            peaceful coexistence.
          </p>
          <div class="about-hero-meta">
            <span>
              <v-icon size="17">mdi-calendar-start</v-icon>
              Established {{ citad.established }}
            </span>
            <span>
              <v-icon size="17">mdi-map-marker-outline</v-icon>
              Kano, Nigeria
            </span>
          </div>
        </div>

        <div class="about-hero-mark">
          <v-img :src="brandLogo" alt="meetCITAD" max-width="235" contain />
        </div>
      </v-container>
    </section>

    <v-container class="about-content">
      <!-- Who we are -->
      <section class="about-section">
        <v-row>
          <v-col cols="12" md="4">
            <p class="about-eyebrow">Who we are</p>
            <h2 class="about-heading">Technology for development</h2>
          </v-col>
          <v-col cols="12" md="8">
            <div class="about-prose">
              <p>
                CITAD is a non-governmental and non-profit organization that is
                committed to the use of information and communication
                technologies for development and promotion of good governance.
                It was established first as a single project (Computer Literacy
                Project) in 1996 but was expanded in 2000 to include other
                projects.
              </p>
              <p>
                CITAD's work spans digital inclusion, cybersecurity, civic
                engagement, and artificial intelligence research, using technology
                to address local and global development challenges.
              </p>
              <p>
                This is a brief introduction for event participants. CITAD's
                institutional news, programmes, publications, and governance
                information remain on its
                <a :href="citad.aboutUrl" target="_blank" rel="noopener noreferrer" class="contact-link">
                  official website
                </a>.
              </p>
            </div>
          </v-col>
        </v-row>
      </section>

      <!-- Vision and mission -->
      <section class="about-section">
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="principle-card h-100" elevation="0">
              <v-icon size="30" color="accent" class="mb-5">mdi-eye-outline</v-icon>
              <p class="principle-label">Vision</p>
              <p class="principle-copy">
                {{ citad.vision }}
              </p>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card class="principle-card h-100" elevation="0">
              <v-icon size="30" color="accent" class="mb-5">mdi-target</v-icon>
              <p class="principle-label">Mission</p>
              <p class="principle-copy">
                {{ citad.mission }}
              </p>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <!-- Brief institutional context, not a programme directory -->
      <section class="about-section">
        <div class="section-intro">
          <p class="about-eyebrow">CITAD's focus</p>
          <h2 class="about-heading">Thematic areas</h2>
        </div>

        <v-row>
          <v-col v-for="area in citad.thematicAreas" :key="area.code" cols="12" md="6">
            <v-card class="focus-card h-100" elevation="0">
              <v-icon size="28" color="accent" class="mb-4">{{ area.icon }}</v-icon>
              <h3 class="focus-title">{{ area.name }} ({{ area.code }})</h3>
              <p class="focus-copy">{{ area.description }}</p>
            </v-card>
          </v-col>
        </v-row>
        <p class="about-prose mt-6">
          Read more about these areas on
          <a :href="citad.thematicAreasUrl" target="_blank" rel="noopener noreferrer" class="contact-link">
            CITAD's official website
          </a>.
        </p>
      </section>

      <!-- Offices listed on the official contact page -->
      <section class="about-section">
        <v-row align="center">
          <v-col cols="12" md="4">
            <p class="about-eyebrow">CITAD offices</p>
            <h2 class="about-heading">Official contact locations</h2>
          </v-col>
          <v-col cols="12" md="8">
            <div class="office-grid">
              <div v-for="office in citad.contactOffices" :key="office.name" class="office-item">
                <p class="office-label">{{ office.label }}</p>
                <p class="office-name">{{ office.name }}</p>
              </div>
            </div>
            <p class="about-prose mt-6">
              These locations are listed on
              <a :href="citad.contactUrl" target="_blank" rel="noopener noreferrer" class="contact-link">
                CITAD's contact page
              </a>.
              Check your event page for its actual venue.
            </p>
          </v-col>
        </v-row>
      </section>

      <!-- meetCITAD platform -->
      <section class="about-section">
        <v-card class="platform-card" elevation="0">
          <v-row align="center">
            <v-col cols="12" md="8">
              <p class="about-eyebrow">meetCITAD</p>
              <h2 class="about-heading mb-4">Event attendance, made simpler</h2>
              <p class="about-prose platform-copy">
                <strong>meetCITAD</strong> is an event attendance platform
                developed for the Centre for Information Technology and
                Development (CITAD). The platform makes event registration,
                QR-based attendance tracking, and verified certificate
                generation simpler for participants and programme teams.
                It complements CITAD's official website; it does not replace it.
              </p>
            </v-col>
            <v-col cols="12" md="4" class="text-md-right">
              <v-btn color="accent" size="large" to="/events" class="platform-btn">
                Explore events
              </v-btn>
            </v-col>
          </v-row>
        </v-card>
      </section>

      <!-- Contact -->
      <section class="about-section">
        <div class="section-intro">
          <p class="about-eyebrow">Get in touch</p>
          <h2 class="about-heading">Contact CITAD</h2>
          <p class="about-prose mt-4">
            General CITAD contact details are below. Use your event page for
            event-specific arrangements and venue information.
          </p>
        </div>

        <v-row>
          <v-col cols="12" md="6">
            <div class="contact-item">
              <v-icon size="20" color="accent">mdi-map-marker-outline</v-icon>
              <div>
                <p class="contact-label">Head office</p>
                <p class="contact-value">{{ citad.headOfficeAddress }}</p>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="contact-item">
              <v-icon size="20" color="accent">mdi-email-outline</v-icon>
              <div>
                <p class="contact-label">Email</p>
                <a class="contact-value contact-link" :href="`mailto:${citad.email}`">
                  {{ citad.email }}
                </a>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="contact-item">
              <v-icon size="20" color="accent">mdi-phone-outline</v-icon>
              <div>
                <p class="contact-label">Phone</p>
                <a class="contact-value contact-link" :href="`tel:${citad.phone}`">
                  {{ citad.phone }}
                </a>
                <p class="contact-value mt-2">{{ citad.openingHours }}</p>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="contact-item">
              <v-icon size="20" color="accent">mdi-web</v-icon>
              <div>
                <p class="contact-label">Website</p>
                <a
                  class="contact-value contact-link"
                  :href="citad.website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ citad.websiteLabel }}
                </a>
              </div>
            </div>
          </v-col>
        </v-row>
      </section>
    </v-container>
  </div>
</template>

<script setup>
import logoWhite from '@/assets/images/logo-white-transparent.png'
import aboutHero from '@/assets/images/hero-2.jpg'
import { citad } from '@/utils/citad'

const brandLogo = logoWhite
</script>

<style scoped>
.about-page {
  background: rgb(var(--v-theme-background));
}

/* ---------------------------------------------------- Hero */
.about-hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(8, 24, 40, 0.97) 0%, rgba(8, 24, 40, 0.9) 56%, rgba(8, 24, 40, 0.72) 100%),
    var(--about-hero-image) center/cover;
  color: #ffffff;
}

.about-hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  max-width: 1280px;
  padding-block: 84px;
}

.about-hero-copy {
  max-width: 700px;
}

.about-eyebrow {
  margin-bottom: 14px;
  color: #c9a44c;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.about-title {
  max-width: 760px;
  color: #ffffff;
  font-size: clamp(2rem, 4.4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.13;
  text-wrap: balance;
}

.about-lead {
  max-width: 600px;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.75;
}

.about-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 26px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.8rem;
}

.about-hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.about-hero-meta .v-icon {
  color: #d8b766;
}

.about-hero-mark {
  flex: 0 0 auto;
  width: 260px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
}

/* ---------------------------------------------------- Content */
.about-content {
  max-width: 1180px;
  padding-block: 12px 72px;
}

.about-section {
  padding-block: 54px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.about-section:last-child {
  border-bottom: 0;
}

.about-heading {
  color: rgb(var(--v-theme-on-background));
  font-size: clamp(1.45rem, 3vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.about-prose {
  color: rgba(var(--v-theme-on-background), 0.7);
  font-size: 0.98rem;
  line-height: 1.85;
}

.about-prose p {
  margin-bottom: 18px;
}

.about-prose p:last-child {
  margin-bottom: 0;
}

.section-intro {
  margin-bottom: 30px;
}

/* ---------------------------------------------------- Vision and mission */
.principle-card {
  height: 100%;
  padding: 34px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
}

.principle-label {
  margin-bottom: 10px;
  color: #a47f2f;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.principle-copy {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.55;
}

/* ---------------------------------------------------- Focus areas */
.focus-card {
  height: 100%;
  padding: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.2s ease;
}

.focus-card:hover {
  border-color: rgba(201, 164, 76, 0.75);
}

.focus-title {
  margin-bottom: 10px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.02rem;
  font-weight: 700;
}

.focus-copy {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.9rem;
  line-height: 1.75;
}

/* ---------------------------------------------------- Offices */
.office-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

.office-item {
  padding: 22px;
  background: rgb(var(--v-theme-surface));
}

.office-label {
  margin-bottom: 5px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.office-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.95rem;
  font-weight: 600;
}

/* ---------------------------------------------------- Platform */
.platform-card {
  padding: 38px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 4px solid #c9a44c;
  border-radius: 6px;
  background:
    linear-gradient(90deg, rgba(201, 164, 76, 0.07), transparent 60%),
    rgb(var(--v-theme-surface));
}

.platform-copy {
  max-width: 720px;
}

.platform-btn {
  border-radius: 4px;
  color: #0f2a44 !important;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* ---------------------------------------------------- Contact */
.contact-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  height: 100%;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
}

.contact-label {
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.contact-value {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
  line-height: 1.65;
}

.contact-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.contact-link:hover {
  color: #a47f2f;
  text-decoration: underline;
}

/* ---------------------------------------------------- Responsive */
@media (max-width: 960px) {
  .about-hero-inner {
    flex-direction: column;
    align-items: flex-start;
    padding-block: 64px;
  }

  .about-hero-mark {
    width: 200px;
    padding: 18px;
  }

  .about-title {
    font-size: 2.15rem;
  }
}

@media (max-width: 600px) {
  .about-hero-inner {
    padding-block: 52px;
  }

  .about-title {
    font-size: 1.85rem;
  }

  .about-section {
    padding-block: 40px;
  }

  .office-grid {
    grid-template-columns: 1fr;
  }

  .platform-card {
    padding: 26px;
  }

  .platform-card .text-md-right {
    margin-top: 20px;
    text-align: left !important;
  }

  .principle-card,
  .focus-card {
    padding: 24px;
  }
}
</style>
