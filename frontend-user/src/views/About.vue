<template>
  <v-container>
    <!-- Header -->
    <v-row class="mt-8 mb-12">
      <v-col cols="12" class="text-center">
        <h1 class="text-h3 font-weight-bold mb-4" style="color: #0F2A44;">
          About CITAD
        </h1>
        <p class="text-h6" style="color: #6B7280; max-width: 900px; margin: 0 auto;">
          Centre for Information Technology and Development
        </p>
      </v-col>
    </v-row>

    <!-- Mission Statement -->
    <v-row class="mb-12">
      <v-col cols="12">
        <v-card class="pa-8" elevation="1">
          <h2 class="text-h5 font-weight-bold mb-4" style="color: #0F2A44;">Our Mission</h2>
          <p class="text-body-1 mb-4" style="color: #6B7280; line-height: 1.8;">
            The Centre for Information Technology and Development (CITAD) is a non-profit organization 
            committed to empowering communities through technology, knowledge sharing, and civic engagement. 
            We believe in using information and communication technologies to promote transparency, 
            accountability, and sustainable development.
          </p>
          <p class="text-body-1" style="color: #6B7280; line-height: 1.8;">
            Through capacity building programs, community workshops, and advocacy initiatives, we work 
            to strengthen civil society, promote digital literacy, and foster inclusive development 
            across Nigeria.
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Impact Areas -->
    <v-row class="mb-12">
      <v-col cols="12" class="mb-6">
        <h2 class="text-h4 font-weight-bold text-center" style="color: #0F2A44;">Focus Areas</h2>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-6 h-100" elevation="1" style="border-left: 4px solid #0F2A44;">
          <v-icon size="40" color="primary" class="mb-3">mdi-school</v-icon>
          <h3 class="text-h6 font-weight-bold mb-3">Capacity Building</h3>
          <p class="text-body-2" style="color: #6B7280;">
            Training programs, workshops, and seminars to enhance digital skills and civic 
            participation among community members, CSOs, and government officials.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-6 h-100" elevation="1" style="border-left: 4px solid #C9A44C;">
          <v-icon size="40" color="accent" class="mb-3">mdi-account-group</v-icon>
          <h3 class="text-h6 font-weight-bold mb-3">Community Engagement</h3>
          <p class="text-body-2" style="color: #6B7280;">
            Facilitating dialogue between citizens, civil society organizations, and government 
            to promote transparency, accountability, and responsive governance.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-6 h-100" elevation="1" style="border-left: 4px solid #0F2A44;">
          <v-icon size="40" color="primary" class="mb-3">mdi-chart-line</v-icon>
          <h3 class="text-h6 font-weight-bold mb-3">Research & Advocacy</h3>
          <p class="text-body-2" style="color: #6B7280;">
            Evidence-based policy advocacy, research publications, and data-driven campaigns 
            to influence positive change in governance and development.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-6 h-100" elevation="1" style="border-left: 4px solid #C9A44C;">
          <v-icon size="40" color="accent" class="mb-3">mdi-laptop</v-icon>
          <h3 class="text-h6 font-weight-bold mb-3">Digital Innovation</h3>
          <p class="text-body-2" style="color: #6B7280;">
            Developing technology solutions and digital tools to address social challenges, 
            improve service delivery, and promote access to information.
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Stats Section -->
    <v-row class="mb-12">
      <v-col cols="12">
        <v-card class="pa-8" color="primary" dark>
          <h2 class="text-h5 font-weight-bold mb-6 text-center">Our Impact</h2>
          <v-row>
            <v-col cols="6" md="3" class="text-center">
              <h3 class="text-h3 font-weight-bold mb-2">150+</h3>
              <p class="text-body-1">Events & Trainings</p>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <h3 class="text-h3 font-weight-bold mb-2">5,000+</h3>
              <p class="text-body-1">Beneficiaries</p>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <h3 class="text-h3 font-weight-bold mb-2">3,500+</h3>
              <p class="text-body-1">Certificates Awarded</p>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <h3 class="text-h3 font-weight-bold mb-2">12+</h3>
              <p class="text-body-1">Active Programs</p>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>

    <!-- Contact Section -->
    <v-row class="mb-12">
      <v-col cols="12">
        <v-card class="pa-8" elevation="1" style="background-color: #F7F8FA;">
          <h2 class="text-h5 font-weight-bold mb-6" style="color: #0F2A44;">Contact Us</h2>
          <v-row>
            <v-col cols="12" md="4">
              <div class="d-flex align-start mb-4">
                <v-icon color="primary" class="mr-3">mdi-map-marker</v-icon>
                <div>
                  <h4 class="font-weight-bold mb-1">Address</h4>
                  <p class="text-body-2" style="color: #6B7280;">
                    No. 4 Yola Street,<br>
                    Nasarawa GRA, Kano<br>
                    Nigeria
                  </p>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="d-flex align-start mb-4">
                <v-icon color="primary" class="mr-3">mdi-email</v-icon>
                <div>
                  <h4 class="font-weight-bold mb-1">Email</h4>
                  <p class="text-body-2" style="color: #6B7280;">
                    info@citad.org
                  </p>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="d-flex align-start mb-4">
                <v-icon color="primary" class="mr-3">mdi-web</v-icon>
                <div>
                  <h4 class="font-weight-bold mb-1">Website</h4>
                  <p class="text-body-2" style="color: #6B7280;">
                    www.citad.org
                  </p>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>

    <!-- About meetCITAD Section -->
    <v-row class="mb-12">
      <v-col cols="12">
        <v-card class="pa-8" elevation="1" style="background-color: #F7F8FA;">
          <div class="mb-4">
            <v-img 
              :src="logo" 
              max-height="48" 
              max-width="200" 
              contain
              class="mb-4"
            ></v-img>
          </div>
          <p class="text-body-1" style="color: #6B7280; line-height: 1.8;">
            <strong>meetCITAD</strong> is a digital event management system developed for the 
            Centre for Information Technology and Development (CITAD). This platform enables 
            efficient event registration, attendance tracking through QR codes, and automated 
            certificate generation for participants.
          </p>
          <p class="text-body-2 mt-4 text-medium-emphasis">
            A civic technology solution by CITAD
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// Import logo image
import logo from '@/assets/images/logo.png'
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
