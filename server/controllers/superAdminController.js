import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { 
  Business, GlobalSettings, User, Customer, Supplier, Sale, StockEntry, 
  Ledger, Payment, AuditLog, Expense, Truck, Employee, Salary, SalaryAdvance,
  Announcement, Plan, Product
} from '../models/index.js';
import { BusinessSettings } from '../models/settings.js';
import { generateSuggestedArthiCode, validateArthiCode } from '../utils/counter.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mandi-secret-key-123!';

// 1. Get List of All Businesses
export async function getBusinesses(req, res) {
  try {
    const businesses = await Business.find({ isDeleted: { $ne: true } });
    const allUsers = await User.find();

    // Enrich businesses with normalized fields for both businessName and name
    const enriched = businesses.map(biz => {
      const bizUsers = allUsers.filter(u => u.tenantId === biz.tenantId);
      const nameVal = biz.name || biz.businessName || 'Mandi Business';
      const planVal = biz.plan || biz.subscriptionPlan || 'Pro';
      const statusVal = biz.status || biz.subscriptionStatus || (biz.isActive !== false ? 'Active' : 'Suspended');
      const expiryVal = biz.subscriptionExpiresAt || biz.subscriptionExpiryDate || '';
      const arthiCodeVal = biz.arthiCode || generateSuggestedArthiCode(nameVal);

      return {
        ...biz,
        name: nameVal,
        businessName: nameVal,
        arthiCode: arthiCodeVal,
        plan: planVal,
        subscriptionPlan: planVal,
        status: statusVal,
        subscriptionStatus: statusVal,
        subscriptionExpiresAt: expiryVal,
        subscriptionExpiryDate: expiryVal,
        totalUsers: bizUsers.length,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Failed to fetch businesses list.' });
  }
}

// 2. Create Business
export async function createBusiness(req, res) {
  try {
    const name = req.body.name || req.body.businessName;
    const ownerName = req.body.ownerName;
    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone || '';
    const address = req.body.address || '';
    const city = req.body.city || '';
    const country = req.body.country || 'Pakistan';
    const plan = req.body.plan || req.body.subscriptionPlan || 'Pro';
    const maxUsers = req.body.maxUsers || 10;
    const subscriptionExpiresAt = req.body.subscriptionExpiresAt || req.body.subscriptionExpiryDate;
    const logo = req.body.logo || '';
    const customTenantId = req.body.tenantId;
    const rawArthiCode = req.body.arthiCode;

    if (!name || !email) {
      return res.status(400).json({ error: 'Please fill in Business Name and Email.' });
    }

    // Process & validate Arthi Code (platform-wide unique, 2-5 uppercase alphanumeric)
    const cleanArthiCode = (rawArthiCode ? rawArthiCode.trim() : generateSuggestedArthiCode(name)).toUpperCase();
    if (!validateArthiCode(cleanArthiCode)) {
      return res.status(400).json({ error: 'Arthi Code must be 2 to 5 alphanumeric characters (e.g. RT, BFM).' });
    }

    // Platform-wide uniqueness check
    const allBusinesses = await Business.find();
    const isDuplicateArthi = allBusinesses.some(b => 
      !b.isDeleted && b.arthiCode && b.arthiCode.trim().toUpperCase() === cleanArthiCode
    );
    if (isDuplicateArthi) {
      return res.status(400).json({ error: `Arthi Code "${cleanArthiCode}" is already in use by another registered business. Please choose a unique code.` });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Generate unique tenantId and businessCode
    const tenantId = customTenantId && customTenantId.trim() !== ''
      ? customTenantId.trim()
      : `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalCount = await Business.countDocuments();
    const businessCode = `BUS-${1001 + totalCount}`;

    const startDate = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create Business Document
    const business = await Business.create({
      name,
      businessName: name,
      businessCode,
      arthiCode: cleanArthiCode,
      ownerName: ownerName || 'Admin',
      email,
      phone,
      address,
      city,
      country,
      logo,
      tenantId,
      plan,
      subscriptionPlan: plan,
      status: 'Active',
      subscriptionStatus: 'Active',
      subscriptionStartDate: startDate,
      subscriptionExpiresAt: subscriptionExpiresAt || defaultExpiry,
      subscriptionExpiryDate: subscriptionExpiresAt || defaultExpiry,
      maxUsers: Number(maxUsers) || 10,
      isActive: true,
      isDeleted: false,
    });

    // Create Owner User Account
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password || 'admin123', salt);

    const ownerUser = await User.create({
      tenantId,
      name: ownerName || 'Admin',
      email,
      password: hashedPassword,
      phone,
      address,
      role: 'Admin',
      status: 'Active',
    });

    // Create Default Business Settings for this tenant
    await BusinessSettings.create({
      tenantId,
      businessName: name,
      ownerName: ownerName || 'Admin',
      email,
      mobileNumber: phone,
      whatsAppNumber: phone,
      address,
      city,
      country,
      currency: 'PKR',
      currencySymbol: 'Rs.',
    });

    res.status(201).json({
      message: 'Business created successfully.',
      business,
      owner: {
        id: ownerUser.id || ownerUser._id,
        name: ownerUser.name,
        email: ownerUser.email,
        role: ownerUser.role,
      }
    });

  } catch (err) {
    console.error('Error creating business:', err);
    res.status(500).json({ error: 'Failed to create business profile.' });
  }
}

// 3. Edit Business
export async function editBusiness(req, res) {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const bName = req.body.name || req.body.businessName || business.name || business.businessName;
    const bOwner = req.body.ownerName || business.ownerName;
    const bEmail = req.body.email || business.email;
    const bPhone = req.body.phone !== undefined ? req.body.phone : business.phone;
    const bPlan = req.body.plan || req.body.subscriptionPlan || business.plan || business.subscriptionPlan;
    const bStatus = req.body.status || req.body.subscriptionStatus || business.status || business.subscriptionStatus || 'Active';
    const bExpiry = req.body.subscriptionExpiresAt || req.body.subscriptionExpiryDate || business.subscriptionExpiresAt || business.subscriptionExpiryDate;

    let bArthiCode = business.arthiCode;
    if (req.body.arthiCode !== undefined && req.body.arthiCode.trim() !== '') {
      const cleanArthi = req.body.arthiCode.trim().toUpperCase();
      if (!validateArthiCode(cleanArthi)) {
        return res.status(400).json({ error: 'Arthi Code must be 2 to 5 alphanumeric characters (e.g. RT, BFM).' });
      }
      // Check uniqueness across other businesses
      const allBusinesses = await Business.find();
      const isDuplicate = allBusinesses.some(b => {
        const bId = b.id || b._id?.toString();
        return (bId !== id && String(bId) !== String(id)) &&
               !b.isDeleted &&
               b.arthiCode &&
               b.arthiCode.trim().toUpperCase() === cleanArthi;
      });
      if (isDuplicate) {
        return res.status(400).json({ error: `Arthi Code "${cleanArthi}" is already assigned to another business.` });
      }
      bArthiCode = cleanArthi;
    }

    const updateData = {
      name: bName,
      businessName: bName,
      arthiCode: bArthiCode,
      ownerName: bOwner,
      email: bEmail,
      phone: bPhone,
      plan: bPlan,
      subscriptionPlan: bPlan,
      status: bStatus,
      subscriptionStatus: bStatus,
      subscriptionExpiresAt: bExpiry,
      subscriptionExpiryDate: bExpiry,
      isActive: bStatus === 'Active',
    };

    const updated = await Business.findByIdAndUpdate(id, updateData);

    // Update Owner User and BusinessSettings if info changed
    if (business.tenantId) {
      const ownerUser = await User.findOne({ tenantId: business.tenantId, role: 'Admin' });
      if (ownerUser) {
        await User.findByIdAndUpdate(ownerUser.id || ownerUser._id, {
          name: bOwner || ownerUser.name,
          phone: bPhone || ownerUser.phone,
          status: bStatus === 'Active' ? 'Active' : 'Inactive'
        });
      }

      const bizSettings = await BusinessSettings.findOne({ tenantId: business.tenantId });
      if (bizSettings) {
        await BusinessSettings.findByIdAndUpdate(bizSettings.id || bizSettings._id, {
          businessName: bName,
          ownerName: bOwner,
          email: bEmail,
          mobileNumber: bPhone,
        });
      } else {
        await BusinessSettings.create({
          tenantId: business.tenantId,
          businessName: bName,
          ownerName: bOwner,
          email: bEmail,
          mobileNumber: bPhone,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating business:', err);
    res.status(500).json({ error: 'Failed to update business details.' });
  }
}

// 4. Toggle Suspend / Activate Business
export async function toggleBusinessStatus(req, res) {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const newStatus = req.body.status || (req.body.isActive === false ? 'Suspended' : 'Active');
    const isActive = newStatus === 'Active';

    const updated = await Business.findByIdAndUpdate(id, {
      status: newStatus,
      subscriptionStatus: newStatus,
      isActive,
    });

    if (business.tenantId) {
      const ownerUser = await User.findOne({ tenantId: business.tenantId, role: 'Admin' });
      if (ownerUser) {
        await User.findByIdAndUpdate(ownerUser.id || ownerUser._id, {
          status: isActive ? 'Active' : 'Inactive'
        });
      }
    }

    res.json({
      message: `Business status updated to ${newStatus}.`,
      business: updated
    });
  } catch (err) {
    console.error('Error toggling business status:', err);
    res.status(500).json({ error: 'Failed to change business status.' });
  }
}

// 5. Reset Business Owner Password
export async function resetOwnerPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const ownerUser = await User.findOne({ tenantId: business.tenantId, role: 'Admin' }) || await User.findOne({ email: business.email });
    if (!ownerUser) {
      return res.status(404).json({ error: 'Owner user account not found for this business.' });
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(newPassword, salt);

    await User.findByIdAndUpdate(ownerUser.id || ownerUser._id, { password: hashedPassword });

    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPER_ADMIN_RESET_PASSWORD',
      details: `Reset owner password for business '${business.businessName}' (${ownerUser.email}).`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `Successfully reset password for owner ${ownerUser.email}.` });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset owner password.' });
  }
}

// 6. Renew Business Subscription
export async function renewSubscription(req, res) {
  try {
    const { id } = req.params;
    const { subscriptionExpiryDate, subscriptionPlan } = req.body;

    if (!subscriptionExpiryDate) {
      return res.status(400).json({ error: 'Please provide a valid subscription expiry date.' });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const updated = await Business.findByIdAndUpdate(id, {
      subscriptionExpiryDate,
      subscriptionPlan: subscriptionPlan || business.subscriptionPlan,
      subscriptionStatus: 'Active',
      isActive: true,
    });

    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPER_ADMIN_RENEW_SUBSCRIPTION',
      details: `Renewed subscription for business '${business.businessName}' until ${subscriptionExpiryDate}.`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Subscription renewed successfully.',
      business: updated
    });
  } catch (err) {
    console.error('Error renewing subscription:', err);
    res.status(500).json({ error: 'Failed to renew subscription.' });
  }
}

// 7. Soft Delete Business
export async function deleteBusiness(req, res) {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const updated = await Business.findByIdAndUpdate(id, {
      isDeleted: true,
      isActive: false,
      subscriptionStatus: 'Suspended',
    });

    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPER_ADMIN_DELETE_BUSINESS',
      details: `Soft deleted business '${business.businessName}' (${business.tenantId}).`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Business deleted successfully.' });
  } catch (err) {
    console.error('Error deleting business:', err);
    res.status(500).json({ error: 'Failed to delete business.' });
  }
}

// 8. Super Admin Dashboard Statistics
export async function getSuperAdminStats(req, res) {
  try {
    const businesses = await Business.find({ isDeleted: { $ne: true } });
    const today = new Date().toISOString().split('T')[0];

    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter(b => b.isActive && b.subscriptionStatus === 'Active').length;
    const inactiveBusinesses = businesses.filter(b => !b.isActive || b.subscriptionStatus === 'Suspended').length;
    const expiredBusinesses = businesses.filter(b => b.subscriptionExpiryDate && b.subscriptionExpiryDate < today).length;
    const trialBusinesses = businesses.filter(b => b.subscriptionPlan === 'Trial').length;

    const allUsers = await User.find({ role: { $ne: 'super_admin' } });
    const allCustomers = await Customer.find({});
    const allSuppliers = await Supplier.find({});
    const allSales = await Sale.find({});

    const recentBusinesses = [...businesses]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    const logs = await AuditLog.find({ action: 'LOGIN' });
    const recentLogins = [...logs]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 10);

    // Revenue / Plan distribution statistics
    const planCounts = {
      Trial: businesses.filter(b => b.subscriptionPlan === 'Trial').length,
      Basic: businesses.filter(b => b.subscriptionPlan === 'Basic').length,
      Standard: businesses.filter(b => b.subscriptionPlan === 'Standard').length,
      Premium: businesses.filter(b => b.subscriptionPlan === 'Premium').length,
      Enterprise: businesses.filter(b => b.subscriptionPlan === 'Enterprise').length,
    };

    res.json({
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      expiredBusinesses,
      trialBusinesses,
      totalUsers: allUsers.length,
      totalCustomers: allCustomers.length,
      totalSuppliers: allSuppliers.length,
      totalSalesRecords: allSales.length,
      recentBusinesses,
      recentLogins,
      planCounts,
    });
  } catch (err) {
    console.error('Error fetching Super Admin stats:', err);
    res.status(500).json({ error: 'Failed to load system statistics.' });
  }
}

// 9. Get All System Users Across Tenants
export async function getAllUsers(req, res) {
  try {
    const users = await User.find();
    const businesses = await Business.find();

    const bizMap = {};
    businesses.forEach(b => {
      bizMap[b.tenantId] = b.businessName;
    });

    const enriched = users.map(u => ({
      id: u.id || u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      tenantId: u.tenantId,
      businessName: u.role === 'super_admin' ? 'MandiOS Platform' : (bizMap[u.tenantId] || 'Default Market'),
      createdAt: u.createdAt,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch platform users.' });
  }
}

// 10. Toggle User Status (Super Admin)
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot deactivate Super Admin user.' });
    }

    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await User.findByIdAndUpdate(id, { status: nextStatus });

    res.json({ message: `User status changed to ${nextStatus}.`, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
}

// 11. Global Settings
export async function getGlobalSettings(req, res) {
  try {
    let settings = await GlobalSettings.findOne({});
    if (!settings) {
      settings = await GlobalSettings.create({
        platformName: 'MandiOS Cloud ERP',
        maintenanceMode: false,
        supportEmail: 'support@mandios.com',
        supportPhone: '03000000000',
        defaultTrialDays: 30,
        allowSelfRegistration: false,
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global settings.' });
  }
}

export async function updateGlobalSettings(req, res) {
  try {
    let settings = await GlobalSettings.findOne({});
    if (!settings) {
      settings = await GlobalSettings.create(req.body);
    } else {
      settings = await GlobalSettings.findByIdAndUpdate(settings.id || settings._id, req.body);
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update global settings.' });
  }
}

// 12. Super Admin Profile Update
export async function updateSuperAdminProfile(req, res) {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized profile update.' });
    }

    const updateData = {
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone,
    };

    if (newPassword) {
      if (!currentPassword || !bcryptjs.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Current password confirmation is incorrect.' });
      }
      const salt = bcryptjs.genSaltSync(10);
      updateData.password = bcryptjs.hashSync(newPassword, salt);
    }

    const updated = await User.findByIdAndUpdate(user.id || user._id, updateData);
    res.json({ message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

// 13. Suggest Unique Arthi Code
export async function suggestArthiCodeHandler(req, res) {
  try {
    const { name } = req.query;
    const base = generateSuggestedArthiCode(name || '');
    const allBiz = await Business.find({ isDeleted: { $ne: true } });
    let candidate = base;
    let suffix = 1;
    while (allBiz.some(b => b.arthiCode && b.arthiCode.trim().toUpperCase() === candidate.toUpperCase())) {
      candidate = (base.substring(0, 4) + suffix).substring(0, 5).toUpperCase();
      suffix++;
    }
    res.json({ suggestedCode: candidate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate suggested code.' });
  }
}

// 14. Impersonate Business (Login as Tenant Admin for Support)
export async function impersonateBusiness(req, res) {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    // Find the Admin user for this tenant
    let targetUser = await User.findOne({ tenantId: business.tenantId, role: 'Admin' });
    if (!targetUser) {
      targetUser = await User.findOne({ email: business.email });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'No Admin user account exists for this business to impersonate.' });
    }

    // Create signed token with impersonation metadata
    const impersonatedToken = jwt.sign(
      {
        id: targetUser.id || targetUser._id,
        email: targetUser.email,
        khataId: targetUser.khataId || '',
        name: targetUser.name,
        role: 'Admin',
        tenantId: business.tenantId,
        isImpersonated: true,
        impersonatedBy: req.user.email || 'super_admin',
        businessName: business.name || business.businessName,
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Record in global Audit Log
    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPER_ADMIN_IMPERSONATE',
      details: `Super Admin started support impersonation session for '${business.name || business.businessName}' (Tenant: ${business.tenantId}).`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: `Support Impersonation active for ${business.name || business.businessName}`,
      token: impersonatedToken,
      user: {
        id: targetUser.id || targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: 'Admin',
        tenantId: business.tenantId,
        isImpersonated: true,
        impersonatedBy: req.user.email || 'super_admin',
        businessName: business.name || business.businessName,
      },
      business: {
        id: business.id || business._id,
        name: business.name || business.businessName,
        tenantId: business.tenantId,
        arthiCode: business.arthiCode,
        plan: business.plan || business.subscriptionPlan,
      }
    });
  } catch (err) {
    console.error('Error impersonating business:', err);
    res.status(500).json({ error: 'Failed to initiate support impersonation session.' });
  }
}

// 15. Real-time Platform Health & Telemetry
export async function getSystemHealth(req, res) {
  try {
    const isMongoReady = mongoose.connection && mongoose.connection.readyState === 1;
    const memory = process.memoryUsage();
    const uptimeSec = process.uptime();

    // Collection counts
    const [
      businessCount,
      userCount,
      customerCount,
      supplierCount,
      saleCount,
      stockCount,
      paymentCount,
      auditLogCount,
      announcementCount,
      productCount
    ] = await Promise.all([
      Business.countDocuments ? Business.countDocuments() : (await Business.find()).length,
      User.countDocuments ? User.countDocuments() : (await User.find()).length,
      Customer.countDocuments ? Customer.countDocuments() : (await Customer.find()).length,
      Supplier.countDocuments ? Supplier.countDocuments() : (await Supplier.find()).length,
      Sale.countDocuments ? Sale.countDocuments() : (await Sale.find()).length,
      StockEntry.countDocuments ? StockEntry.countDocuments() : (await StockEntry.find()).length,
      Payment.countDocuments ? Payment.countDocuments() : (await Payment.find()).length,
      AuditLog.countDocuments ? AuditLog.countDocuments() : (await AuditLog.find()).length,
      Announcement.countDocuments ? Announcement.countDocuments() : (await Announcement.find()).length,
      Product.countDocuments ? Product.countDocuments() : (await Product.find()).length,
    ]);

    const formatUptime = (seconds) => {
      const d = Math.floor(seconds / (3600 * 24));
      const h = Math.floor((seconds % (3600 * 24)) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
    };

    res.json({
      status: isMongoReady ? 'Operational' : 'Degraded',
      database: {
        engine: isMongoReady ? 'MongoDB (Replica/Atlas/Docker)' : 'Local File Persistence Engine',
        state: isMongoReady ? 'Connected' : 'Fallback Local File Ready',
        host: mongoose.connection?.host || 'localhost',
        dbName: mongoose.connection?.name || 'mandi_db',
      },
      server: {
        uptime: formatUptime(uptimeSec),
        uptimeSeconds: Math.floor(uptimeSec),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      memory: {
        rssMb: (memory.rss / 1024 / 1024).toFixed(1),
        heapUsedMb: (memory.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMb: (memory.heapTotal / 1024 / 1024).toFixed(1),
      },
      counts: {
        businesses: businessCount,
        users: userCount,
        customers: customerCount,
        suppliers: supplierCount,
        products: productCount,
        sales: saleCount,
        stockEntries: stockCount,
        payments: paymentCount,
        auditLogs: auditLogCount,
        announcements: announcementCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching system health:', err);
    res.status(500).json({ error: 'Failed to retrieve system telemetry.' });
  }
}

// 16. Disaster Recovery: Full Database JSON Export
export async function exportAllDatabaseBackup(req, res) {
  try {
    const [
      businesses,
      users,
      customers,
      suppliers,
      products,
      sales,
      stockEntries,
      ledgers,
      payments,
      expenses,
      trucks,
      employees,
      salaries,
      announcements,
      plans,
      globalSettings
    ] = await Promise.all([
      Business.find(),
      User.find(),
      Customer.find(),
      Supplier.find(),
      Product.find(),
      Sale.find(),
      StockEntry.find(),
      Ledger.find(),
      Payment.find(),
      Expense.find(),
      Truck.find(),
      Employee.find(),
      Salary.find(),
      Announcement.find(),
      Plan.find(),
      GlobalSettings.find(),
    ]);

    // Sanitize passwords out of backup for security
    const sanitizedUsers = users.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });

    const snapshot = {
      meta: {
        system: 'MandiOS Cloud ERP Platform Backup',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
        totalRecords: businesses.length + users.length + customers.length + suppliers.length + sales.length + stockEntries.length,
      },
      data: {
        businesses,
        users: sanitizedUsers,
        customers,
        suppliers,
        products,
        sales,
        stockEntries,
        ledgers,
        payments,
        expenses,
        trucks,
        employees,
        salaries,
        announcements,
        plans,
        globalSettings,
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mandios_full_backup_${Date.now()}.json`);
    res.send(JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('Error creating database backup:', err);
    res.status(500).json({ error: 'Failed to generate database backup.' });
  }
}

// 17. Export Single Tenant Data JSON
export async function exportTenantData(req, res) {
  try {
    const { tenantId } = req.params;
    const business = await Business.findOne({ tenantId });
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const [
      users,
      customers,
      suppliers,
      products,
      sales,
      stockEntries,
      ledgers,
      payments,
      expenses,
      trucks,
      employees
    ] = await Promise.all([
      User.find({ tenantId }),
      Customer.find({ tenantId }),
      Supplier.find({ tenantId }),
      Product.find({ tenantId }),
      Sale.find({ tenantId }),
      StockEntry.find({ tenantId }),
      Ledger.find({ tenantId }),
      Payment.find({ tenantId }),
      Expense.find({ tenantId }),
      Truck.find({ tenantId }),
      Employee.find({ tenantId }),
    ]);

    const sanitizedUsers = users.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });

    const tenantSnapshot = {
      meta: {
        tenantId,
        businessName: business.name || business.businessName,
        arthiCode: business.arthiCode,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
      },
      data: {
        business,
        users: sanitizedUsers,
        customers,
        suppliers,
        products,
        sales,
        stockEntries,
        ledgers,
        payments,
        expenses,
        trucks,
        employees,
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tenant_${tenantId}_export_${Date.now()}.json`);
    res.send(JSON.stringify(tenantSnapshot, null, 2));
  } catch (err) {
    console.error('Error exporting tenant data:', err);
    res.status(500).json({ error: 'Failed to export tenant data.' });
  }
}

// 18. Announcements & Broadcasts Management
export async function getAnnouncements(req, res) {
  try {
    const list = await Announcement.find();
    res.json(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
}

export async function createAnnouncement(req, res) {
  try {
    const { title, message, type, targetAudience, expiresAt } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const item = await Announcement.create({
      title,
      message,
      type: type || 'info',
      targetAudience: targetAudience || 'All',
      isActive: true,
      createdBy: req.user.name || 'Super Admin',
      expiresAt: expiresAt || '',
    });

    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_SYSTEM_BROADCAST',
      details: `Published platform broadcast: "${title}".`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish announcement.' });
  }
}

export async function toggleAnnouncementStatus(req, res) {
  try {
    const { id } = req.params;
    const item = await Announcement.findById(id);
    if (!item) return res.status(404).json({ error: 'Announcement not found.' });

    const updated = await Announcement.findByIdAndUpdate(id, { isActive: !item.isActive });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
}

// 19. Public / Tenant Endpoint for Active Announcements
export async function getActiveAnnouncements(req, res) {
  try {
    const all = await Announcement.find({ isActive: true });
    const today = new Date().toISOString().split('T')[0];
    const valid = all.filter(a => !a.expiresAt || a.expiresAt >= today);
    res.json(valid);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve active broadcasts.' });
  }
}

// 20. SaaS Plans & Quotas Management
export async function getSubscriptionPlans(req, res) {
  try {
    let plans = await Plan.find();
    if (!plans || plans.length === 0) {
      // Seed initial default plans
      plans = [
        await Plan.create({
          name: 'Basic',
          priceMonthly: 3000,
          priceAnnual: 30000,
          maxUsers: 3,
          maxProducts: 25,
          description: 'Essential Mandi Ledger for small single-clerk commission shops.',
          features: { logistics: false, multiLanguage: true, reportsExport: true, returnsModule: false, smsWhatsApp: false, prioritySupport: false },
          isPopular: false,
          status: 'Active',
        }),
        await Plan.create({
          name: 'Pro',
          priceMonthly: 6000,
          priceAnnual: 60000,
          maxUsers: 10,
          maxProducts: 150,
          description: 'Full-featured Mandi ERP with truck arrivals, crates & returns tracking.',
          features: { logistics: true, multiLanguage: true, reportsExport: true, returnsModule: true, smsWhatsApp: true, prioritySupport: false },
          isPopular: true,
          status: 'Active',
        }),
        await Plan.create({
          name: 'Enterprise',
          priceMonthly: 15000,
          priceAnnual: 150000,
          maxUsers: 50,
          maxProducts: 1000,
          description: 'High-volume market brokers with multi-branch staff & dedicated support.',
          features: { logistics: true, multiLanguage: true, reportsExport: true, returnsModule: true, smsWhatsApp: true, prioritySupport: true },
          isPopular: false,
          status: 'Active',
        })
      ];
    }
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription plans.' });
  }
}

export async function createSubscriptionPlan(req, res) {
  try {
    const { name, priceMonthly, priceAnnual, maxUsers, maxProducts, description, features, isPopular } = req.body;
    if (!name) return res.status(400).json({ error: 'Plan name is required.' });

    const newPlan = await Plan.create({
      name,
      priceMonthly: Number(priceMonthly) || 0,
      priceAnnual: Number(priceAnnual) || 0,
      maxUsers: Number(maxUsers) || 5,
      maxProducts: Number(maxProducts) || 50,
      description: description || '',
      features: features || { logistics: true, multiLanguage: true, reportsExport: true, returnsModule: true, smsWhatsApp: false, prioritySupport: false },
      isPopular: Boolean(isPopular),
      status: 'Active',
    });

    res.status(201).json(newPlan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan.' });
  }
}

export async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const updated = await Plan.findByIdAndUpdate(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan.' });
  }
}

export async function deleteSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    await Plan.findByIdAndDelete(id);
    res.json({ message: 'Plan deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
}

// 21. Update Tenant Quotas & Feature Toggles
export async function updateTenantFeatures(req, res) {
  try {
    const { id } = req.params;
    const { features, maxUsers, plan } = req.body;

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ error: 'Business not found.' });

    const updated = await Business.findByIdAndUpdate(id, {
      features: features !== undefined ? features : business.features,
      maxUsers: maxUsers !== undefined ? Number(maxUsers) : business.maxUsers,
      plan: plan || business.plan,
      subscriptionPlan: plan || business.subscriptionPlan,
    });

    await AuditLog.create({
      tenantId: 'super_admin_logs',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_TENANT_QUOTAS',
      details: `Updated quotas & feature toggles for business '${business.name || business.businessName}'.`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Tenant quotas updated successfully.', business: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant quotas.' });
  }
}

// 22. Get Super Admin Global Security Audit Logs
export async function getSuperAdminAuditLogs(req, res) {
  try {
    const allLogs = await AuditLog.find();
    const sorted = allLogs.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
    res.json(sorted.slice(0, 100));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global audit logs.' });
  }
}


