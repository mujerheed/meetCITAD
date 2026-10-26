/**
 * Public CITAD details checked against the official website on 26 October 2026.
 * Keep this small: meetCITAD handles event attendance, not institutional content.
 * Sources and the approval-based roadmap are documented in docs/CITAD_ALIGNMENT.md.
 */
export const citad = {
  name: 'Centre for Information Technology and Development',
  established: 1996,
  website: 'https://citad.org.ng/',
  websiteLabel: 'www.citad.org.ng',
  aboutUrl: 'https://citad.org.ng/about-us/',
  contactUrl: 'https://citad.org.ng/contact/',
  thematicAreasUrl: 'https://citad.org.ng/thematic-areas/',
  email: 'info@citad.org',
  phone: '+2347074111137',
  openingHours: 'Monday–Friday, 9:00 am–5:00 pm (Africa/Lagos)',
  headOfficeAddress:
    'Plot 4 Samaila Adamu Gano Street, Gandu Layout, adjacent NSITF building, Social Insurance Road, Trade Fair Complex, Zaria Road, Kano State, Nigeria',
  vision: 'A knowledge-based democratic and self-reliant society.',
  mission:
    'To empower citizens for a just and knowledge-based society that is anchored on sustainable and balanced development using ICT, capacity development, advocacy, research and partnership.',
  // These are the offices listed on the contact page, not an exhaustive footprint.
  contactOffices: [
    { name: 'Kano', label: 'Head office' },
    { name: 'Abuja, FCT', label: 'Office' },
    { name: 'Bauchi, Bauchi State', label: 'Office' },
    { name: 'Dutse, Jigawa State', label: 'Office' },
    { name: 'Jama’are, Bauchi State', label: 'Office' },
    { name: 'Itas, Bauchi State', label: 'Office' },
  ],
  // Use the published thematic labels without asserting an internal unit count.
  thematicAreas: [
    {
      code: 'DIRAI',
      name: 'Digital Rights and Inclusion',
      icon: 'mdi-shield-account-outline',
      description:
        'Promoting equitable access to digital technologies, online safety, and the protection of digital rights for all communities, especially underserved and vulnerable groups.',
    },
    {
      code: 'DISAE',
      name: 'Digital Skills & Entrepreneurship',
      icon: 'mdi-school-outline',
      description:
        'Empowering individuals with in-demand digital skills and entrepreneurial knowledge to create sustainable businesses and thrive in the digital economy.',
    },
    {
      code: 'TAPEB',
      name: 'Technology in Peace Building',
      icon: 'mdi-handshake-outline',
      description:
        'Leveraging technology-driven solutions to foster dialogue, prevent conflict, and support peacebuilding initiatives within communities and institutions.',
    },
    {
      code: 'TICAP',
      name: 'Technology, Innovation & Prosperity',
      icon: 'mdi-lightbulb-outline',
      description:
        'Driving innovation and inclusive growth through technology, research, and strategic initiatives that support economic prosperity and social development.',
    },
  ],
  socialLinks: [
    { label: 'CITAD on Facebook', url: 'https://www.facebook.com/CITAD3', icon: 'mdi-facebook' },
    { label: 'CITAD on X', url: 'https://x.com/ICTAdvocates', icon: 'mdi-twitter' },
    { label: 'CITAD on YouTube', url: 'https://www.youtube.com/@Citadchannel', icon: 'mdi-youtube' },
    { label: 'CITAD on Mastodon', url: 'https://social.citad.org.ng/', icon: 'mdi-mastodon' },
    { label: 'CITAD official website', url: 'https://citad.org.ng/', icon: 'mdi-web' },
  ],
}
