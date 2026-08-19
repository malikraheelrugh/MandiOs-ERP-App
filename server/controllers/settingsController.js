import {
  BusinessSettings,
  CommissionRule,
  Unit,
  Charge,
  ExpenseCategory,
  PaymentMethod,
  InvoiceSettings,
  ApplicationSettings,
  NotificationSettings,
  LedgerSettings,
  TaxSetting
} from '../models/settings.js';
import { AuditLog, Business } from '../models/index.js';
import { calculateCommission } from '../utils/commissionService.js';
import { buildTenantQuery, getTenantId } from '../utils/tenant.js';

// Helper for consistent error responses
const handleError = (res, errorMsg, status = 500) => {
  res.status(status).json({ error: errorMsg });
};

// --- Dynamic Commission Calculation API ---
export async function getCalculatedCommission(req, res) {
  try {
    const { productId, supplierId, customerId, quantity, unit, weight, saleRate } = req.query;
    const commission = await calculateCommission({
      productId,
      supplierId,
      customerId,
      quantity: Number(quantity) || 1,
      unit,
      weight: Number(weight) || 0,
      saleRate: Number(saleRate) || 0
    });
    res.json({ commission });
  } catch (err) {
    handleError(res, 'Failed to calculate commission dynamically');
  }
}

// --- 1. BUSINESS PROFILE (Single Document) ---
export async function getBusinessSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';

    // Look up officially registered Business record for this tenant
    const biz = await Business.findOne({ tenantId });

    let settings = await BusinessSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await BusinessSettings.create({
        tenantId,
        businessName: biz?.name || biz?.businessName || 'Sabzi & Fruit Mandi Trade Brokerage',
        ownerName: biz?.ownerName || 'Mian Rashid (Admin)',
        email: biz?.email || '',
        mobileNumber: biz?.phone || '',
        whatsAppNumber: biz?.phone || '',
        address: biz?.address || '',
        city: biz?.city || '',
        country: biz?.country || 'Pakistan',
      });
    }

    const result = settings.toObject ? settings.toObject() : { ...settings };

    // Always fetch and synchronize official registration data from Business model
    if (biz) {
      result.businessName = biz.name || biz.businessName || result.businessName;
      result.ownerName = biz.ownerName || result.ownerName;
      result.email = biz.email || result.email;
      result.mobileNumber = biz.phone || result.mobileNumber;
      result.address = biz.address || result.address;
      result.city = biz.city || result.city;
      result.country = biz.country || result.country;
      result.businessCode = biz.businessCode || '';
      result.subscriptionPlan = biz.plan || biz.subscriptionPlan || 'Trial';
      result.subscriptionStatus = biz.status || biz.subscriptionStatus || 'Active';
      result.subscriptionExpiresAt = biz.subscriptionExpiresAt || biz.subscriptionExpiryDate || '';
      result.tenantId = biz.tenantId || tenantId;
      result.isRegisteredBusiness = true;
    }

    res.json(result);
  } catch (err) {
    handleError(res, 'Failed to fetch business settings');
  }
}

export async function updateBusinessSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';

    const biz = await Business.findOne({ tenantId });
    let settings = await BusinessSettings.findOne(tenantQuery);

    const updateBody = { ...req.body };

    // Prevent overriding registered business fields if official Business registration exists
    if (biz) {
      updateBody.businessName = biz.name || biz.businessName;
      updateBody.ownerName = biz.ownerName;
      updateBody.email = biz.email;
      updateBody.mobileNumber = biz.phone;
      updateBody.address = biz.address;
      updateBody.city = biz.city;
      updateBody.country = biz.country;
    }

    if (!settings) {
      settings = await BusinessSettings.create({ ...updateBody, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await BusinessSettings.findByIdAndUpdate(id, { ...updateBody, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_BUSINESS_SETTINGS',
      details: `Updated business profile configurations for ${updateBody.businessName || 'system'}.`,
      timestamp: new Date().toISOString()
    });

    const result = settings.toObject ? settings.toObject() : { ...settings };
    if (biz) {
      result.businessName = biz.name || biz.businessName;
      result.ownerName = biz.ownerName;
      result.email = biz.email;
      result.mobileNumber = biz.phone;
      result.address = biz.address;
      result.city = biz.city;
      result.country = biz.country;
      result.businessCode = biz.businessCode || '';
      result.subscriptionPlan = biz.plan || biz.subscriptionPlan || 'Trial';
      result.subscriptionStatus = biz.status || biz.subscriptionStatus || 'Active';
      result.subscriptionExpiresAt = biz.subscriptionExpiresAt || biz.subscriptionExpiryDate || '';
      result.tenantId = biz.tenantId || tenantId;
      result.isRegisteredBusiness = true;
    }

    res.json(result);
  } catch (err) {
    handleError(res, 'Failed to update business settings');
  }
}

// --- 2. COMMISSION RULES (CRUD) ---
export async function getCommissionRules(req, res) {
  try {
    const rules = await CommissionRule.find(buildTenantQuery(req));
    res.json(rules || []);
  } catch (err) {
    handleError(res, 'Failed to fetch commission rules');
  }
}

export async function addCommissionRule(req, res) {
  try {
    const { name, commissionType, value, chargeBasis, appliesTo, scope } = req.body;
    if (!name || !commissionType || value === undefined || !chargeBasis || !appliesTo || !scope) {
      return handleError(res, 'Missing required commission rule parameters', 400);
    }

    const tenantId = getTenantId(req) || 'tenant_default_001';
    const existing = await CommissionRule.findOne(buildTenantQuery(req, { name }));
    if (existing) return handleError(res, 'Commission rule with this name already exists', 400);

    const rule = await CommissionRule.create({ ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_COMMISSION_RULE',
      details: `Created new commission rule: ${name}.`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(rule);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Commission rule with this name already exists', 400);
    }
    handleError(res, 'Failed to create commission rule');
  }
}

export async function editCommissionRule(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const rule = await CommissionRule.findById(id);
    if (!rule) return handleError(res, 'Rule not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && rule.tenantId && rule.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this commission rule', 403);
    }

    if (name && name !== rule.name) {
      const existing = await CommissionRule.findOne(buildTenantQuery(req, { name }));
      if (existing && (existing._id || existing.id) !== id) {
        return handleError(res, 'Commission rule with this name already exists', 400);
      }
    }

    const tenantId = rule.tenantId || userTenantId || 'tenant_default_001';
    const updated = await CommissionRule.findByIdAndUpdate(id, { ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_COMMISSION_RULE',
      details: `Updated commission rule: ${rule.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Commission rule with this name already exists', 400);
    }
    handleError(res, 'Failed to update commission rule');
  }
}

export async function deleteCommissionRule(req, res) {
  try {
    const { id } = req.params;
    const rule = await CommissionRule.findById(id);
    if (!rule) return handleError(res, 'Rule not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && rule.tenantId && rule.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this commission rule', 403);
    }

    await CommissionRule.findByIdAndDelete(id);
    const tenantId = rule.tenantId || userTenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_COMMISSION_RULE',
      details: `Deleted commission rule: ${rule.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Commission rule deleted successfully' });
  } catch (err) {
    handleError(res, 'Failed to delete commission rule');
  }
}

// --- 3. UNITS (CRUD) ---
export async function getUnits(req, res) {
  try {
    const units = await Unit.find(buildTenantQuery(req));
    res.json(units || []);
  } catch (err) {
    handleError(res, 'Failed to fetch units');
  }
}

export async function addUnit(req, res) {
  try {
    const { name } = req.body;
    if (!name) return handleError(res, 'Unit name is required', 400);

    const tenantId = getTenantId(req) || 'tenant_default_001';
    const existing = await Unit.findOne(buildTenantQuery(req, { name }));
    if (existing) return handleError(res, 'Unit with this name already exists', 400);

    const unit = await Unit.create({ ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_UNIT',
      details: `Added new unit: ${name}.`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(unit);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Unit with this name already exists', 400);
    }
    handleError(res, 'Failed to create unit');
  }
}

export async function editUnit(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const unit = await Unit.findById(id);
    if (!unit) return handleError(res, 'Unit not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && unit.tenantId && unit.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this unit', 403);
    }

    if (name && name !== unit.name) {
      const existing = await Unit.findOne(buildTenantQuery(req, { name }));
      if (existing && (existing._id || existing.id) !== id) {
        return handleError(res, 'Unit with this name already exists', 400);
      }
    }

    const tenantId = unit.tenantId || userTenantId || 'tenant_default_001';
    const updated = await Unit.findByIdAndUpdate(id, { ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_UNIT',
      details: `Updated unit info: ${unit.name} -> ${name || unit.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Unit with this name already exists', 400);
    }
    handleError(res, 'Failed to update unit');
  }
}

export async function deleteUnit(req, res) {
  try {
    const { id } = req.params;
    const unit = await Unit.findById(id);
    if (!unit) return handleError(res, 'Unit not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && unit.tenantId && unit.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this unit', 403);
    }

    await Unit.findByIdAndDelete(id);
    const tenantId = unit.tenantId || userTenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_UNIT',
      details: `Deleted unit: ${unit.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Unit deleted successfully' });
  } catch (err) {
    handleError(res, 'Failed to delete unit');
  }
}

// --- 4. CHARGES (CRUD) ---
export async function getCharges(req, res) {
  try {
    const charges = await Charge.find(buildTenantQuery(req));
    res.json(charges || []);
  } catch (err) {
    handleError(res, 'Failed to fetch charges');
  }
}

export async function addCharge(req, res) {
  try {
    const { name, type, value, chargeBasis, appliesTo } = req.body;
    if (!name || !type || value === undefined || !chargeBasis || !appliesTo) {
      return handleError(res, 'Missing required charge configuration parameters', 400);
    }

    const tenantId = getTenantId(req) || 'tenant_default_001';
    const existing = await Charge.findOne(buildTenantQuery(req, { name }));
    if (existing) return handleError(res, 'Charge with this name already exists', 400);

    const charge = await Charge.create({ ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_CHARGE',
      details: `Added new charge rule: ${name}.`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(charge);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Charge with this name already exists', 400);
    }
    handleError(res, 'Failed to create charge');
  }
}

export async function editCharge(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const charge = await Charge.findById(id);
    if (!charge) return handleError(res, 'Charge not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && charge.tenantId && charge.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this charge', 403);
    }

    if (name && name !== charge.name) {
      const existing = await Charge.findOne(buildTenantQuery(req, { name }));
      if (existing && (existing._id || existing.id) !== id) {
        return handleError(res, 'Charge with this name already exists', 400);
      }
    }

    const tenantId = charge.tenantId || userTenantId || 'tenant_default_001';
    const updated = await Charge.findByIdAndUpdate(id, { ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_CHARGE',
      details: `Updated charge parameters for: ${charge.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Charge with this name already exists', 400);
    }
    handleError(res, 'Failed to update charge');
  }
}

export async function deleteCharge(req, res) {
  try {
    const { id } = req.params;
    const charge = await Charge.findById(id);
    if (!charge) return handleError(res, 'Charge not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && charge.tenantId && charge.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this charge', 403);
    }

    await Charge.findByIdAndDelete(id);
    const tenantId = charge.tenantId || userTenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_CHARGE',
      details: `Deleted charge definition: ${charge.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Charge deleted successfully' });
  } catch (err) {
    handleError(res, 'Failed to delete charge');
  }
}

// --- 5. EXPENSE CATEGORIES (CRUD) ---
export async function getExpenseCategories(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let categories = await ExpenseCategory.find(tenantQuery);
    if (!categories || categories.length === 0) {
      const defaults = [
        { name: 'Unloading Charges', description: 'Mandatory arrival gate unloading labor fees', status: 'Active', tenantId },
        { name: 'Labour & Loading', description: 'Internal mandi labor & crate shifting charges', status: 'Active', tenantId },
        { name: 'Transport & Freight', description: 'Inbound orchard truck freight charges', status: 'Active', tenantId },
        { name: 'Packing & Crates', description: 'Crate packaging & strapping expenses', status: 'Active', tenantId },
        { name: 'Market Cess & Tax', description: 'Government mandi market board fees', status: 'Active', tenantId },
        { name: 'Miscellaneous', description: 'Other supplier lot deductions', status: 'Active', tenantId }
      ];
      categories = [];
      for (const d of defaults) {
        try {
          const existing = await ExpenseCategory.findOne({ name: d.name, tenantId });
          if (existing) {
            categories.push(existing);
          } else {
            const created = await ExpenseCategory.create(d);
            categories.push(created);
          }
        } catch (catErr) {
          const found = await ExpenseCategory.findOne({ name: d.name, tenantId }).catch(() => null);
          if (found) categories.push(found);
        }
      }
    }
    res.json(categories || []);
  } catch (err) {
    console.error('Failed to fetch expense categories:', err);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    const fallbackDefaults = [
      { _id: 'ec_1', id: 'ec_1', name: 'Unloading Charges', description: 'Mandatory arrival gate unloading labor fees', status: 'Active', tenantId },
      { _id: 'ec_2', id: 'ec_2', name: 'Labour & Loading', description: 'Internal mandi labor & crate shifting charges', status: 'Active', tenantId },
      { _id: 'ec_3', id: 'ec_3', name: 'Transport & Freight', description: 'Inbound orchard truck freight charges', status: 'Active', tenantId },
      { _id: 'ec_4', id: 'ec_4', name: 'Packing & Crates', description: 'Crate packaging & strapping expenses', status: 'Active', tenantId },
      { _id: 'ec_5', id: 'ec_5', name: 'Market Cess & Tax', description: 'Government mandi market board fees', status: 'Active', tenantId },
      { _id: 'ec_6', id: 'ec_6', name: 'Miscellaneous', description: 'Other supplier lot deductions', status: 'Active', tenantId }
    ];
    res.json(fallbackDefaults);
  }
}

export async function addExpenseCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return handleError(res, 'Category name is required', 400);

    const tenantId = getTenantId(req) || 'tenant_default_001';
    const existing = await ExpenseCategory.findOne(buildTenantQuery(req, { name }));
    if (existing) return handleError(res, 'Expense category already exists for your business', 400);

    const category = await ExpenseCategory.create({ ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_EXPENSE_CATEGORY',
      details: `Created new expense category: ${name}.`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Expense category already exists for your business', 400);
    }
    handleError(res, 'Failed to create expense category');
  }
}

export async function editExpenseCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await ExpenseCategory.findById(id);
    if (!category) return handleError(res, 'Category not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && category.tenantId && category.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this expense category', 403);
    }

    if (name && name !== category.name) {
      const existing = await ExpenseCategory.findOne(buildTenantQuery(req, { name }));
      if (existing && (existing._id || existing.id) !== id) {
        return handleError(res, 'Expense category already exists for your business', 400);
      }
    }

    const tenantId = category.tenantId || userTenantId || 'tenant_default_001';
    const updated = await ExpenseCategory.findByIdAndUpdate(id, { ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_EXPENSE_CATEGORY',
      details: `Updated expense category: ${category.name} -> ${name || category.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Expense category already exists for your business', 400);
    }
    handleError(res, 'Failed to update expense category');
  }
}

export async function deleteExpenseCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await ExpenseCategory.findById(id);
    if (!category) return handleError(res, 'Category not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && category.tenantId && category.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this expense category', 403);
    }

    await ExpenseCategory.findByIdAndDelete(id);
    const tenantId = category.tenantId || userTenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_EXPENSE_CATEGORY',
      details: `Deleted expense category: ${category.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Expense category deleted successfully' });
  } catch (err) {
    handleError(res, 'Failed to delete expense category');
  }
}

// --- 6. PAYMENT METHODS (CRUD) ---
export async function getPaymentMethods(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let methods = await PaymentMethod.find(tenantQuery);
    if (!methods || methods.length === 0) {
      const defaults = [
        { name: 'Cash', description: 'Counter physical cash handout/collection', detailsRequired: false, status: 'Active', tenantId },
        { name: 'Bank Transfer', description: 'Direct bank account transfer (IBFT/Wire)', detailsRequired: true, status: 'Active', tenantId },
        { name: 'Cheque', description: 'Bank cheque book clearing', detailsRequired: true, status: 'Active', tenantId },
        { name: 'EasyPaisa / JazzCash', description: 'Mobile wallet transaction', detailsRequired: true, status: 'Active', tenantId }
      ];
      methods = [];
      for (const d of defaults) {
        try {
          const existing = await PaymentMethod.findOne({ name: d.name, tenantId });
          if (existing) {
            methods.push(existing);
          } else {
            const created = await PaymentMethod.create(d);
            methods.push(created);
          }
        } catch (pmErr) {
          const found = await PaymentMethod.findOne({ name: d.name, tenantId }).catch(() => null);
          if (found) methods.push(found);
        }
      }
    }
    res.json(methods || []);
  } catch (err) {
    console.error('Failed to fetch payment methods:', err);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    const fallbackDefaults = [
      { _id: 'pm_cash', id: 'pm_cash', name: 'Cash', description: 'Counter physical cash handout/collection', detailsRequired: false, status: 'Active', tenantId },
      { _id: 'pm_bank', id: 'pm_bank', name: 'Bank Transfer', description: 'Direct bank account transfer (IBFT/Wire)', detailsRequired: true, status: 'Active', tenantId },
      { _id: 'pm_cheque', id: 'pm_cheque', name: 'Cheque', description: 'Bank cheque book clearing', detailsRequired: true, status: 'Active', tenantId },
      { _id: 'pm_ep', id: 'pm_ep', name: 'EasyPaisa / JazzCash', description: 'Mobile wallet transaction', detailsRequired: true, status: 'Active', tenantId }
    ];
    res.json(fallbackDefaults);
  }
}

export async function addPaymentMethod(req, res) {
  try {
    const { name } = req.body;
    if (!name) return handleError(res, 'Payment method name is required', 400);

    const tenantId = getTenantId(req) || 'tenant_default_001';
    const existing = await PaymentMethod.findOne(buildTenantQuery(req, { name }));
    if (existing) return handleError(res, 'Payment method already exists for your business', 400);

    const method = await PaymentMethod.create({ ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_PAYMENT_METHOD',
      details: `Added payment method: ${name}.`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(method);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Payment method already exists for your business', 400);
    }
    handleError(res, 'Failed to create payment method');
  }
}

export async function editPaymentMethod(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const method = await PaymentMethod.findById(id);
    if (!method) return handleError(res, 'Payment method not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && method.tenantId && method.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this payment method', 403);
    }

    if (name && name !== method.name) {
      const existing = await PaymentMethod.findOne(buildTenantQuery(req, { name }));
      if (existing && (existing._id || existing.id) !== id) {
        return handleError(res, 'Payment method already exists for your business', 400);
      }
    }

    const tenantId = method.tenantId || userTenantId || 'tenant_default_001';
    const updated = await PaymentMethod.findByIdAndUpdate(id, { ...req.body, tenantId });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_PAYMENT_METHOD',
      details: `Updated payment method: ${method.name} -> ${name || method.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return handleError(res, 'Payment method already exists for your business', 400);
    }
    handleError(res, 'Failed to update payment method');
  }
}

export async function deletePaymentMethod(req, res) {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findById(id);
    if (!method) return handleError(res, 'Payment method not found', 404);

    const userTenantId = getTenantId(req);
    if (req.user?.role !== 'super_admin' && method.tenantId && method.tenantId !== userTenantId) {
      return handleError(res, 'Unauthorized access to this payment method', 403);
    }

    await PaymentMethod.findByIdAndDelete(id);
    const tenantId = method.tenantId || userTenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_PAYMENT_METHOD',
      details: `Deleted payment method: ${method.name}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Payment method deleted successfully' });
  } catch (err) {
    handleError(res, 'Failed to delete payment method');
  }
}

// --- 7. INVOICE SETTINGS (Single Document) ---
export async function getInvoiceSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await InvoiceSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await InvoiceSettings.create({
        tenantId,
        companyLogo: '',
        header: 'COMMISSION AGENT & WHOLESALE BROKER',
        footer: 'Thank you for your business!'
      });
    }
    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to fetch invoice settings');
  }
}

export async function updateInvoiceSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await InvoiceSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await InvoiceSettings.create({ ...req.body, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await InvoiceSettings.findByIdAndUpdate(id, { ...req.body, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_INVOICE_SETTINGS',
      details: `Updated system invoice print settings.`,
      timestamp: new Date().toISOString()
    });

    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to update invoice settings');
  }
}

// --- 8. APPLICATION SETTINGS (Single Document) ---
export async function getApplicationSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await ApplicationSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await ApplicationSettings.create({
        tenantId,
        theme: 'dark',
        language: 'en'
      });
    }
    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to fetch application settings');
  }
}

export async function updateApplicationSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await ApplicationSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await ApplicationSettings.create({ ...req.body, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await ApplicationSettings.findByIdAndUpdate(id, { ...req.body, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_APP_SETTINGS',
      details: `Updated global application configuration settings.`,
      timestamp: new Date().toISOString()
    });

    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to update application settings');
  }
}

// --- 9. NOTIFICATION SETTINGS (Single Document) ---
export async function getNotificationSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await NotificationSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await NotificationSettings.create({
        tenantId,
        emailNotifications: false,
        smsNotifications: false,
        whatsAppNotifications: false
      });
    }
    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to fetch notification settings');
  }
}

export async function updateNotificationSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await NotificationSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await NotificationSettings.create({ ...req.body, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await NotificationSettings.findByIdAndUpdate(id, { ...req.body, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_NOTIFICATION_SETTINGS',
      details: `Updated push & message alert notification settings.`,
      timestamp: new Date().toISOString()
    });

    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to update notification settings');
  }
}

// --- 10. LEDGER SETTINGS (Single Document) ---
export async function getLedgerSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await LedgerSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await LedgerSettings.create({
        tenantId,
        autoPostSale: true,
        autoPostPayment: true
      });
    }
    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to fetch ledger settings');
  }
}

export async function updateLedgerSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await LedgerSettings.findOne(tenantQuery);
    if (!settings) {
      settings = await LedgerSettings.create({ ...req.body, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await LedgerSettings.findByIdAndUpdate(id, { ...req.body, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_LEDGER_SETTINGS',
      details: `Updated double-entry ledger posting rules.`,
      timestamp: new Date().toISOString()
    });

    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to update ledger settings');
  }
}

// --- 11. TAX SETTINGS (Single Document) ---
export async function getTaxSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await TaxSetting.findOne(tenantQuery);
    if (!settings) {
      settings = await TaxSetting.create({
        tenantId,
        taxName: 'Sales Tax',
        taxRate: 0,
        isTaxEnabled: false
      });
    }
    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to fetch tax settings');
  }
}

export async function updateTaxSettings(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req);
    const tenantId = getTenantId(req) || 'tenant_default_001';
    let settings = await TaxSetting.findOne(tenantQuery);
    if (!settings) {
      settings = await TaxSetting.create({ ...req.body, tenantId });
    } else {
      const id = settings.id || settings._id;
      settings = await TaxSetting.findByIdAndUpdate(id, { ...req.body, tenantId });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_TAX_SETTINGS',
      details: `Updated tax settings for invoice items.`,
      timestamp: new Date().toISOString()
    });

    res.json(settings);
  } catch (err) {
    handleError(res, 'Failed to update tax settings');
  }
}
