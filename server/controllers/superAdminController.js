import bcryptjs from 'bcryptjs';
import { Business, GlobalSettings, User, Customer, Supplier, Sale, AuditLog } from '../models/index.js';
import { BusinessSettings } from '../models/settings.js';

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

      return {
        ...biz,
        name: nameVal,
        businessName: nameVal,
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

    if (!name || !email) {
      return res.status(400).json({ error: 'Please fill in Business Name and Email.' });
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

    const updateData = {
      name: bName,
      businessName: bName,
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
