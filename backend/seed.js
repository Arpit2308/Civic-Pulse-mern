const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const CivicIssue = require('./models/CivicIssue');

// Refuse to run in production environment
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed.js refused to run because NODE_ENV is set to "production".');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse';

const SEED_EMAILS = [
  'admin@civicpulse.com',
  'deptadmin@civicpulse.com',
  'worker.roads@civicpulse.com',
  'worker.sanitation@civicpulse.com',
  'worker.water@civicpulse.com',
  'citizen1@civicpulse.com',
  'citizen2@civicpulse.com',
];

const DEFAULT_PASSWORD = 'Test@1234';

function extractDbName(uri) {
  if (!uri) return 'unknown';
  try {
    const withoutQuery = uri.split('?')[0];
    const slashIdx = withoutQuery.lastIndexOf('/');
    if (slashIdx !== -1) {
      const dbPart = withoutQuery.substring(slashIdx + 1);
      if (dbPart && !dbPart.includes(':') && !dbPart.includes('@')) {
        return dbPart;
      }
    }
  } catch (_) {}
  return 'default';
}

async function runSeed() {
  const isConfirm = process.argv.includes('--confirm');

  try {
    await mongoose.connect(MONGO_URI);
    const dbName = mongoose.connection.name || extractDbName(MONGO_URI);

    const seedUsersToDelete = await User.countDocuments({ email: { $in: SEED_EMAILS } });
    const seedIssuesToDelete = await CivicIssue.countDocuments({ isSeed: true });

    if (!isConfirm) {
      console.log('====================================================');
      console.log('       CivicPulse Database Seed (DRY RUN)           ');
      console.log('====================================================');
      console.log(`Database Target: "${dbName}"`);
      console.log('\n[Dry Run Safety Mode: No modifications were made]');
      console.log(`- Seed users that WOULD be deleted: ${seedUsersToDelete}`);
      console.log(`- Seed issues that WOULD be deleted: ${seedIssuesToDelete}`);
      console.log('- Seed users that WOULD be created: 7');
      console.log('  * 1 super_admin (admin@civicpulse.com)');
      console.log('  * 1 dept_admin (deptadmin@civicpulse.com)');
      console.log('  * 3 workers (Roads, Sanitation, Water)');
      console.log('  * 2 citizens (citizen1, citizen2)');
      console.log('- Seed issues that WOULD be created: 8');
      console.log('  * 2 unassigned');
      console.log('  * 2 assigned');
      console.log('  * 2 in-progress with history');
      console.log('  * 2 resolved with resolutionDetails');
      console.log('\nTo execute the seed for real, run:');
      console.log('  npm run seed -- --confirm');
      console.log('  or');
      console.log('  node seed.js --confirm\n');

      await mongoose.disconnect();
      process.exit(0);
    }

    // --- WITH --confirm: PERFORM SEED ---
    console.log('====================================================');
    console.log('           CivicPulse Database Seeding              ');
    console.log('====================================================');
    console.log(`Database Target: "${dbName}"`);

    console.log('\nStep 1: Deleting existing seed records...');
    console.log(`- Deleting ${seedUsersToDelete} seed user(s)...`);
    const userDelResult = await User.deleteMany({ email: { $in: SEED_EMAILS } });
    console.log(`  Done (${userDelResult.deletedCount} users removed).`);

    console.log(`- Deleting ${seedIssuesToDelete} seed issue(s)...`);
    const issueDelResult = await CivicIssue.deleteMany({ isSeed: true });
    console.log(`  Done (${issueDelResult.deletedCount} issues removed).`);

    console.log('\nStep 2: Hashing passwords and creating seed users...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@civicpulse.com',
      password: hashedPassword,
      role: 'super_admin',
      department: 'General',
      phone: '9876543210',
      pincode: '110001',
    });

    const deptAdmin = await User.create({
      name: 'Roads Dept Admin',
      email: 'deptadmin@civicpulse.com',
      password: hashedPassword,
      role: 'dept_admin',
      department: 'Roads & Potholes',
      phone: '9876543211',
      pincode: '110001',
    });

    const roadsWorker = await User.create({
      name: 'Ramesh Sharma',
      email: 'worker.roads@civicpulse.com',
      password: hashedPassword,
      role: 'worker',
      department: 'Roads & Potholes',
      phone: '9876543212',
      pincode: '110001',
    });

    const sanitationWorker = await User.create({
      name: 'Suresh Kumar',
      email: 'worker.sanitation@civicpulse.com',
      password: hashedPassword,
      role: 'worker',
      department: 'Sanitation & Garbage',
      phone: '9876543213',
      pincode: '110002',
    });

    const waterWorker = await User.create({
      name: 'Vikram Singh',
      email: 'worker.water@civicpulse.com',
      password: hashedPassword,
      role: 'worker',
      department: 'Water Supply',
      phone: '9876543214',
      pincode: '110003',
    });

    const citizen1 = await User.create({
      name: 'Priya Sharma',
      email: 'citizen1@civicpulse.com',
      password: hashedPassword,
      role: 'citizen',
      phone: '9876543215',
      pincode: '110001',
    });

    const citizen2 = await User.create({
      name: 'Amit Verma',
      email: 'citizen2@civicpulse.com',
      password: hashedPassword,
      role: 'citizen',
      phone: '9876543216',
      pincode: '110002',
    });

    console.log('  Created 7 seed users successfully.');

    console.log('\nStep 3: Creating 8 sample civic issues...');
    const now = new Date();

    const sampleIssues = [
      // 2 Unassigned
      {
        title: 'Major Pothole on Sector 4 Main Road',
        description: 'Deep pothole causing vehicle damage and traffic slowdowns near metro pillar 42.',
        category: 'Roads & Potholes',
        department: 'Roads & Potholes',
        location: { address: 'Sector 4 Main Road, near Metro Pillar 42', pincode: '110001' },
        priority: 'High',
        status: 'Reported',
        reportedBy: citizen1._id,
        assignedWorker: null,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen1._id, changedAt: new Date(now - 3600000 * 48), comment: 'Issue reported by citizen' },
        ],
      },
      {
        title: 'Overflowing Garbage Dumpster on Park Street',
        description: 'Public dumpster has not been cleared for 4 days, causing foul smell and health hazard.',
        category: 'Sanitation & Garbage',
        department: 'Sanitation & Garbage',
        location: { address: '14 Park Street Market', pincode: '110002' },
        priority: 'Medium',
        status: 'Reported',
        reportedBy: citizen2._id,
        assignedWorker: null,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen2._id, changedAt: new Date(now - 3600000 * 36), comment: 'Issue reported by citizen' },
        ],
      },

      // 2 Assigned
      {
        title: 'Low Water Pressure in Block B',
        description: 'Water supply pressure has dropped significantly during morning peak hours.',
        category: 'Water Supply',
        department: 'Water Supply',
        location: { address: 'Block B, Residential Enclave', pincode: '110003' },
        priority: 'Medium',
        status: 'Reported',
        reportedBy: citizen1._id,
        assignedWorker: waterWorker._id,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen1._id, changedAt: new Date(now - 3600000 * 30), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 20), comment: 'Assigned to Water Worker Vikram Singh' },
        ],
      },
      {
        title: 'Damaged Pavement Curb on Crossroad 5',
        description: 'Concrete curb stones displaced, creating pedestrian tripping hazard.',
        category: 'Roads & Potholes',
        department: 'Roads & Potholes',
        location: { address: 'Crossroad 5, near City Library', pincode: '110001' },
        priority: 'Low',
        status: 'Reported',
        reportedBy: citizen2._id,
        assignedWorker: roadsWorker._id,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen2._id, changedAt: new Date(now - 3600000 * 24), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 18), comment: 'Assigned to Roads Worker Ramesh Sharma' },
        ],
      },

      // 2 In-Progress with history
      {
        title: 'Main Pipeline Burst Flooding Service Lane',
        description: 'Subsurface pipe fracture leaking potable water across service lane.',
        category: 'Water Supply',
        department: 'Water Supply',
        location: { address: 'Service Lane 3, Ring Road Junction', pincode: '110003' },
        priority: 'High',
        status: 'In Progress',
        reportedBy: citizen1._id,
        assignedWorker: waterWorker._id,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen1._id, changedAt: new Date(now - 3600000 * 20), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 14), comment: 'Assigned to Water Worker Vikram Singh' },
          { status: 'In Progress', changedBy: waterWorker._id, changedAt: new Date(now - 3600000 * 8), comment: 'Valve isolated; replacement pipe sections arriving on site' },
        ],
      },
      {
        title: 'Construction Debris Dumped on Public Walkway',
        description: 'Uncollected mortar and brick rubble blocking wheelchair ramp access.',
        category: 'Sanitation & Garbage',
        department: 'Sanitation & Garbage',
        location: { address: '88 Commercial Promenade, Sector 12', pincode: '110002' },
        priority: 'Medium',
        status: 'In Progress',
        reportedBy: citizen2._id,
        assignedWorker: sanitationWorker._id,
        isSeed: true,
        statusHistory: [
          { status: 'Reported', changedBy: citizen2._id, changedAt: new Date(now - 3600000 * 18), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 12), comment: 'Assigned to Sanitation Worker Suresh Kumar' },
          { status: 'In Progress', changedBy: sanitationWorker._id, changedAt: new Date(now - 3600000 * 6), comment: 'Dispatched hydraulic loader to clear heavy rubble' },
        ],
      },

      // 2 Resolved with resolutionDetails
      {
        title: 'Deep Crater Repaired Near General Hospital Emergency',
        description: 'Hazardous sinkage near ambulance entrance filled and leveled.',
        category: 'Roads & Potholes',
        department: 'Roads & Potholes',
        location: { address: 'General Hospital Gate 2, Ring Road', pincode: '110001' },
        priority: 'High',
        status: 'Resolved',
        reportedBy: citizen1._id,
        assignedWorker: roadsWorker._id,
        isSeed: true,
        resolutionDetails: {
          resolvedAt: new Date(now - 3600000 * 24),
          resolvedBy: roadsWorker._id,
          proofImageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
          notes: 'Excavated loose base, filled with cold-mix asphalt, and compacted with roller.',
        },
        statusHistory: [
          { status: 'Reported', changedBy: citizen1._id, changedAt: new Date(now - 3600000 * 72), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 60), comment: 'Assigned to Roads Worker Ramesh Sharma' },
          { status: 'In Progress', changedBy: roadsWorker._id, changedAt: new Date(now - 3600000 * 36), comment: 'Repair crew on site with roller' },
          { status: 'Resolved', changedBy: roadsWorker._id, changedAt: new Date(now - 3600000 * 24), comment: 'Asphalt compaction complete and road opened for ambulances' },
        ],
      },
      {
        title: 'Illegal Solid Waste Dumping Ground Cleared',
        description: 'Vacant municipal plot cleared of accumulated non-biodegradable waste.',
        category: 'Sanitation & Garbage',
        department: 'Sanitation & Garbage',
        location: { address: 'Plot 42, Industrial Sector 5', pincode: '110002' },
        priority: 'Medium',
        status: 'Resolved',
        reportedBy: citizen2._id,
        assignedWorker: sanitationWorker._id,
        isSeed: true,
        resolutionDetails: {
          resolvedAt: new Date(now - 3600000 * 12),
          resolvedBy: sanitationWorker._id,
          proofImageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
          notes: '3 truckloads of solid waste transported to treatment plant. Perimeter spray applied.',
        },
        statusHistory: [
          { status: 'Reported', changedBy: citizen2._id, changedAt: new Date(now - 3600000 * 48), comment: 'Issue reported by citizen' },
          { status: 'Reported', changedBy: deptAdmin._id, changedAt: new Date(now - 3600000 * 36), comment: 'Assigned to Sanitation Worker Suresh Kumar' },
          { status: 'In Progress', changedBy: sanitationWorker._id, changedAt: new Date(now - 3600000 * 24), comment: 'Sanitation fleet conducting deep cleaning' },
          { status: 'Resolved', changedBy: sanitationWorker._id, changedAt: new Date(now - 3600000 * 12), comment: 'All waste cleared and bio-sanitizer sprayed' },
        ],
      },
    ];

    await CivicIssue.create(sampleIssues);
    console.log('  Created 8 sample issues successfully.');

    console.log('\n====================================================');
    console.log('             Seed Completed Successfully!           ');
    console.log('====================================================');
    console.log('Credentials Summary:');
    console.log('  - Super Admin: admin@civicpulse.com        | Role: super_admin');
    console.log('  - Dept Admin:  deptadmin@civicpulse.com    | Role: dept_admin | Dept: Roads & Potholes');
    console.log('  - Worker 1:    worker.roads@civicpulse.com | Role: worker     | Dept: Roads & Potholes');
    console.log('  - Worker 2:    worker.sanitation@civicpulse.com | Role: worker | Dept: Sanitation & Garbage');
    console.log('  - Worker 3:    worker.water@civicpulse.com | Role: worker     | Dept: Water Supply');
    console.log('  - Citizen 1:   citizen1@civicpulse.com     | Role: citizen');
    console.log('  - Citizen 2:   citizen2@civicpulse.com     | Role: citizen');
    console.log(`\nPassword for ALL created accounts: ${DEFAULT_PASSWORD}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed process failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runSeed();
