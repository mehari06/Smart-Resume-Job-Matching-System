const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get recruiter
  const recruiter = await p.user.findUnique({ where: { email: 'bereketteshome95@gmail.com' } });
  if (!recruiter) { console.log('Recruiter not found!'); return; }
  
  // Make sure recruiter has RECRUITER role
  await p.user.update({ where: { id: recruiter.id }, data: { role: 'RECRUITER', approvalStatus: 'APPROVED' } });
  console.log('Recruiter role set:', recruiter.email);

  // Delete all existing jobs
  const deleted = await p.job.deleteMany({});
  console.log(`Deleted ${deleted.count} existing jobs`);

  const categories = [
    'AI/ML', 'Cloud', 'Data', 'Data Science', 'Design',
    'DevOps', 'Education & Training', 'Frontend Engineering', 'Fullstack Engineering',
    'Healthcare', 'Journalism & Media', 'Legal Services', 'Media & Creative',
    'Networking', 'QA', 'Sales & Marketing', 'Security'
  ];

  const jobTemplates = {
    'AI/ML': [
      { title: 'Machine Learning Engineer', skills: ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn'], salary: '$120k-$160k' },
      { title: 'AI Product Manager', skills: ['Product Strategy', 'ML Fundamentals', 'Agile', 'Roadmapping'], salary: '$110k-$150k' },
      { title: 'NLP Researcher', skills: ['NLP', 'Python', 'HuggingFace', 'BERT', 'GPT'], salary: '$130k-$175k' },
      { title: 'Computer Vision Engineer', skills: ['OpenCV', 'PyTorch', 'Python', 'YOLO', 'Deep Learning'], salary: '$125k-$165k' },
      { title: 'MLOps Engineer', skills: ['MLflow', 'Kubernetes', 'Python', 'Docker', 'CI/CD'], salary: '$115k-$155k' },
    ],
    'Cloud': [
      { title: 'AWS Solutions Architect', skills: ['AWS', 'CloudFormation', 'EC2', 'S3', 'Lambda'], salary: '$130k-$170k' },
      { title: 'GCP Cloud Engineer', skills: ['GCP', 'Terraform', 'Kubernetes', 'BigQuery'], salary: '$120k-$160k' },
      { title: 'Azure DevOps Engineer', skills: ['Azure', 'CI/CD', 'ARM Templates', 'PowerShell'], salary: '$115k-$150k' },
      { title: 'Cloud Security Architect', skills: ['IAM', 'Zero Trust', 'AWS Security', 'Compliance'], salary: '$140k-$180k' },
      { title: 'FinOps Cloud Analyst', skills: ['Cost Optimization', 'AWS', 'Budgeting', 'CloudWatch'], salary: '$100k-$135k' },
    ],
    'Data': [
      { title: 'Data Engineer', skills: ['Spark', 'Kafka', 'Python', 'SQL', 'Airflow'], salary: '$110k-$150k' },
      { title: 'Database Administrator', skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Performance Tuning'], salary: '$95k-$130k' },
      { title: 'ETL Developer', skills: ['SSIS', 'Talend', 'Python', 'SQL', 'Data Warehousing'], salary: '$90k-$125k' },
      { title: 'Data Architect', skills: ['Data Modeling', 'Snowflake', 'dbt', 'SQL', 'AWS'], salary: '$130k-$170k' },
      { title: 'Analytics Engineer', skills: ['dbt', 'SQL', 'Looker', 'Python', 'BigQuery'], salary: '$105k-$145k' },
    ],
    'Data Science': [
      { title: 'Senior Data Scientist', skills: ['Python', 'R', 'Statistics', 'Machine Learning', 'SQL'], salary: '$125k-$165k' },
      { title: 'Quantitative Analyst', skills: ['Python', 'Statistics', 'Finance', 'SQL', 'R'], salary: '$135k-$175k' },
      { title: 'Business Intelligence Analyst', skills: ['Tableau', 'Power BI', 'SQL', 'Excel', 'Python'], salary: '$85k-$115k' },
      { title: 'Research Scientist', skills: ['Python', 'Machine Learning', 'Statistics', 'Publications'], salary: '$140k-$180k' },
      { title: 'Decision Scientist', skills: ['A/B Testing', 'Python', 'SQL', 'Causal Inference'], salary: '$115k-$155k' },
    ],
    'Design': [
      { title: 'Senior UX Designer', skills: ['Figma', 'User Research', 'Prototyping', 'Wireframing'], salary: '$100k-$140k' },
      { title: 'Product Designer', skills: ['Figma', 'Design Systems', 'User Testing', 'Sketch'], salary: '$95k-$130k' },
      { title: 'UI Design Lead', skills: ['Figma', 'Motion Design', 'HTML/CSS', 'Design Tokens'], salary: '$105k-$145k' },
      { title: 'Brand Designer', skills: ['Adobe Suite', 'Brand Strategy', 'Illustration', 'Typography'], salary: '$80k-$110k' },
      { title: 'Design System Engineer', skills: ['React', 'Figma', 'Storybook', 'CSS', 'TypeScript'], salary: '$110k-$150k' },
    ],
    'DevOps': [
      { title: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux'], salary: '$115k-$155k' },
      { title: 'Site Reliability Engineer', skills: ['SRE', 'Go', 'Prometheus', 'Grafana', 'Python'], salary: '$130k-$170k' },
      { title: 'Platform Engineer', skills: ['Kubernetes', 'Helm', 'Python', 'Terraform', 'ArgoCD'], salary: '$120k-$160k' },
      { title: 'Build & Release Engineer', skills: ['Jenkins', 'GitHub Actions', 'Gradle', 'Maven'], salary: '$95k-$130k' },
      { title: 'Infrastructure Engineer', skills: ['Ansible', 'Terraform', 'AWS', 'Linux', 'Bash'], salary: '$110k-$150k' },
    ],
    'Education & Training': [
      { title: 'Instructional Designer', skills: ['eLearning', 'Articulate', 'LMS', 'Curriculum Design'], salary: '$70k-$95k' },
      { title: 'Technical Trainer', skills: ['Training Delivery', 'Curriculum Development', 'LMS', 'Cloud'], salary: '$75k-$100k' },
      { title: 'EdTech Product Manager', skills: ['Product Management', 'LMS', 'Agile', 'User Research'], salary: '$100k-$135k' },
      { title: 'Corporate Learning Specialist', skills: ['L&D', 'Facilitation', 'Needs Analysis', 'LMS'], salary: '$65k-$90k' },
      { title: 'Coding Bootcamp Instructor', skills: ['JavaScript', 'React', 'Node.js', 'Teaching'], salary: '$70k-$95k' },
    ],
    'Frontend Engineering': [
      { title: 'Senior React Developer', skills: ['React', 'TypeScript', 'Next.js', 'CSS', 'Redux'], salary: '$115k-$155k' },
      { title: 'Vue.js Engineer', skills: ['Vue.js', 'Nuxt', 'TypeScript', 'Pinia', 'Tailwind CSS'], salary: '$105k-$140k' },
      { title: 'Frontend Architect', skills: ['React', 'Micro Frontends', 'Webpack', 'TypeScript'], salary: '$130k-$170k' },
      { title: 'Angular Developer', skills: ['Angular', 'TypeScript', 'RxJS', 'NgRx', 'Jest'], salary: '$100k-$135k' },
      { title: 'Web Performance Engineer', skills: ['Core Web Vitals', 'Lighthouse', 'React', 'Browser APIs'], salary: '$110k-$150k' },
    ],
    'Fullstack Engineering': [
      { title: 'Fullstack Engineer (Node/React)', skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'], salary: '$120k-$165k' },
      { title: 'Python Fullstack Developer', skills: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker'], salary: '$110k-$150k' },
      { title: 'Fullstack Lead Engineer', skills: ['Next.js', 'Go', 'PostgreSQL', 'Kubernetes', 'AWS'], salary: '$140k-$180k' },
      { title: 'Ruby on Rails Developer', skills: ['Ruby on Rails', 'React', 'PostgreSQL', 'Heroku'], salary: '$100k-$140k' },
      { title: 'Java Fullstack Developer', skills: ['Spring Boot', 'React', 'Java', 'MySQL', 'Docker'], salary: '$115k-$155k' },
    ],
    'Healthcare': [
      { title: 'Health Informatics Analyst', skills: ['EHR', 'HL7', 'FHIR', 'SQL', 'Data Analysis'], salary: '$85k-$115k' },
      { title: 'Clinical Data Manager', skills: ['Clinical Trials', 'Medidata', 'SAS', 'FDA Compliance'], salary: '$90k-$125k' },
      { title: 'Healthcare Software Engineer', skills: ['Python', 'HIPAA', 'FHIR', 'React', 'PostgreSQL'], salary: '$105k-$145k' },
      { title: 'Telehealth Product Manager', skills: ['Product Management', 'Healthcare', 'Agile', 'HIPAA'], salary: '$100k-$140k' },
      { title: 'Medical Device Engineer', skills: ['Embedded C', 'FDA', 'ISO 13485', 'Hardware'], salary: '$110k-$150k' },
    ],
    'Journalism & Media': [
      { title: 'Data Journalist', skills: ['Python', 'D3.js', 'SQL', 'Tableau', 'Investigative Reporting'], salary: '$65k-$90k' },
      { title: 'Digital Content Strategist', skills: ['SEO', 'Content Marketing', 'Analytics', 'CMS'], salary: '$60k-$85k' },
      { title: 'Multimedia Producer', skills: ['Video Editing', 'Premiere Pro', 'After Effects', 'Storytelling'], salary: '$55k-$80k' },
      { title: 'News Editor', skills: ['Editorial', 'AP Style', 'CMS', 'Leadership', 'Breaking News'], salary: '$70k-$100k' },
      { title: 'Broadcast Journalist', skills: ['Camera', 'Reporting', 'Script Writing', 'Live Broadcasting'], salary: '$60k-$85k' },
    ],
    'Legal Services': [
      { title: 'Legal Tech Product Manager', skills: ['Legal Tech', 'Product Management', 'Agile', 'SaaS'], salary: '$110k-$150k' },
      { title: 'eDiscovery Analyst', skills: ['Relativity', 'eDiscovery', 'Legal Research', 'Document Review'], salary: '$70k-$95k' },
      { title: 'Contract Technology Analyst', skills: ['Contract AI', 'Legal Research', 'CLM Software'], salary: '$75k-$100k' },
      { title: 'Compliance Engineer', skills: ['GDPR', 'SOC 2', 'Legal Tech', 'Python', 'Risk Assessment'], salary: '$100k-$140k' },
      { title: 'Intellectual Property Analyst', skills: ['Patent Search', 'IP Law', 'Technical Writing'], salary: '$80k-$110k' },
    ],
    'Media & Creative': [
      { title: 'Creative Director', skills: ['Brand Strategy', 'Adobe Suite', 'Art Direction', 'Leadership'], salary: '$110k-$155k' },
      { title: 'Motion Graphics Designer', skills: ['After Effects', 'Cinema 4D', 'Premiere Pro', 'Animation'], salary: '$75k-$105k' },
      { title: 'Social Media Manager', skills: ['Content Creation', 'Analytics', 'Copywriting', 'Paid Ads'], salary: '$55k-$80k' },
      { title: '3D Artist', skills: ['Blender', 'Maya', 'ZBrush', 'Texturing', 'Rendering'], salary: '$70k-$100k' },
      { title: 'Podcast Producer', skills: ['Audio Editing', 'Adobe Audition', 'Content Strategy', 'RSS'], salary: '$50k-$75k' },
    ],
    'Networking': [
      { title: 'Network Engineer', skills: ['Cisco', 'BGP', 'OSPF', 'Firewalls', 'VLAN'], salary: '$100k-$140k' },
      { title: 'Network Security Engineer', skills: ['Firewall', 'IDS/IPS', 'VPN', 'SIEM', 'Zero Trust'], salary: '$115k-$155k' },
      { title: 'Cloud Networking Specialist', skills: ['AWS VPC', 'Azure Networking', 'BGP', 'SD-WAN'], salary: '$120k-$160k' },
      { title: 'Wireless Network Engineer', skills: ['Wi-Fi 6', 'Cisco Meraki', 'RF Design', '5G'], salary: '$95k-$130k' },
      { title: 'NOC Engineer', skills: ['Network Monitoring', 'SNMP', 'Incident Response', 'Linux'], salary: '$75k-$105k' },
    ],
    'QA': [
      { title: 'QA Automation Engineer', skills: ['Selenium', 'Cypress', 'Playwright', 'Python', 'Jest'], salary: '$100k-$135k' },
      { title: 'Performance Test Engineer', skills: ['JMeter', 'Gatling', 'k6', 'Load Testing', 'Python'], salary: '$95k-$130k' },
      { title: 'QA Lead', skills: ['Test Strategy', 'Selenium', 'JIRA', 'Agile', 'CI/CD'], salary: '$110k-$150k' },
      { title: 'Mobile QA Engineer', skills: ['Appium', 'XCUITest', 'Espresso', 'iOS', 'Android'], salary: '$95k-$130k' },
      { title: 'Security QA Engineer', skills: ['Penetration Testing', 'OWASP', 'Burp Suite', 'Automation'], salary: '$105k-$145k' },
    ],
    'Sales & Marketing': [
      { title: 'Growth Marketing Manager', skills: ['A/B Testing', 'Google Analytics', 'SEO', 'Paid Ads'], salary: '$90k-$130k' },
      { title: 'Technical Sales Engineer', skills: ['SaaS', 'CRM', 'Demo', 'Solutions Architecture'], salary: '$100k-$145k' },
      { title: 'Marketing Data Analyst', skills: ['Google Analytics', 'SQL', 'Tableau', 'HubSpot', 'Python'], salary: '$80k-$115k' },
      { title: 'Account Executive (SaaS)', skills: ['Salesforce', 'SaaS Selling', 'Negotiation', 'Pipeline Management'], salary: '$85k-$140k' },
      { title: 'Product Marketing Manager', skills: ['Go-to-Market', 'Competitive Analysis', 'Messaging', 'Launch'], salary: '$105k-$145k' },
    ],
    'Security': [
      { title: 'Penetration Tester', skills: ['Metasploit', 'Burp Suite', 'OWASP', 'Python', 'Kali Linux'], salary: '$110k-$155k' },
      { title: 'Security Operations Engineer', skills: ['SIEM', 'Splunk', 'Incident Response', 'Threat Intel'], salary: '$105k-$145k' },
      { title: 'Cloud Security Engineer', skills: ['AWS Security', 'Zero Trust', 'IAM', 'CSPM', 'Terraform'], salary: '$120k-$165k' },
      { title: 'Application Security Engineer', skills: ['SAST', 'DAST', 'OWASP', 'Secure Code Review'], salary: '$115k-$155k' },
      { title: 'CISO Analyst', skills: ['Risk Management', 'Governance', 'Compliance', 'ISO 27001', 'NIST'], salary: '$130k-$175k' },
    ],
  };

  // 3 tech jobs posted by the recruiter
  const techCategories = ['Frontend Engineering', 'Fullstack Engineering', 'AI/ML'];
  
  let totalCreated = 0;
  
  for (const category of categories) {
    const templates = jobTemplates[category] || [];
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const isRecruiterJob = techCategories.includes(category) && i === 0;
      await p.job.create({
        data: {
          title: t.title,
          company: isRecruiterJob ? 'TechBridge Solutions' : getCompany(category, i),
          location: getLocation(i),
          type: getType(i),
          salary: t.salary,
          description: getDescription(t.title, category, t.skills),
          skills: t.skills,
          source: isRecruiterJob ? 'INTERNAL' : 'INTERNAL',
          category: category,
          experience: getExperience(i),
          isActive: true,
          postedById: isRecruiterJob ? recruiter.id : null,
        }
      });
      totalCreated++;
    }
  }
  
  console.log(`Created ${totalCreated} jobs successfully!`);
}

function getCompany(category, index) {
  const companies = [
    'Nexus Corp', 'DataFlow Inc', 'CloudPeak Technologies', 'Synapse Labs',
    'Vertex AI', 'Horizon Systems', 'Pulse Analytics', 'Catalyze Digital',
    'Apex Solutions', 'Meridian Tech'
  ];
  return companies[(index + category.length) % companies.length];
}

function getLocation(index) {
  const locations = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
    'Remote', 'Chicago, IL', 'Boston, MA', 'Los Angeles, CA'
  ];
  return locations[index % locations.length];
}

function getType(index) {
  const types = ['FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'CONTRACT', 'REMOTE'];
  return types[index % types.length];
}

function getExperience(index) {
  const levels = ['0-2 years', '2-4 years', '4-6 years', '6-8 years', '8+ years'];
  return levels[index % levels.length];
}

function getDescription(title, category, skills) {
  return `We are looking for a talented ${title} to join our growing ${category} team.

In this role, you will:
• Collaborate with cross-functional teams to design and implement scalable solutions
• Apply your expertise in ${skills.slice(0, 3).join(', ')} to solve complex problems
• Contribute to technical architecture decisions and best practices
• Mentor junior team members and drive engineering excellence
• Work in an agile environment with continuous deployment

Requirements:
• Proficiency in ${skills.join(', ')}
• Strong problem-solving and communication skills
• Experience working in fast-paced, collaborative environments
• Passion for building high-quality, maintainable software

We offer competitive compensation, flexible work arrangements, comprehensive health benefits, and exciting growth opportunities.`;
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
