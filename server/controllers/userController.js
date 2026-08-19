import bcryptjs from 'bcryptjs';
import { User, Customer, Supplier, Employee, AuditLog, Ledger, Payment, StockEntry, Sale } from '../models/index.js';
import { buildTenantQuery, getTenantId } from '../utils/tenant.js';

// --- CLERKS ---
export async function getClerks(req, res) {
  try {
    const clerks = await User.find(buildTenantQuery(req, { role: 'Clerk', isDeleted: { $ne: true } }));
    res.json(clerks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clerks.' });
  }
}

export async function addClerk(req, res) {
  try {
    const { name, email, password, phone, address, status } = req.body;
    const tenantId = getTenantId(req) || 'tenant_default_001';

    if (!name || !phone || !email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({ error: 'Please provide name, email, password, and phone number for creating a clerk account.' });
    }

    const trimmedEmail = email.trim();
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    const clerkData = {
      tenantId,
      name,
      email: trimmedEmail,
      password: hashedPassword,
      phone,
      address,
      role: 'Clerk',
      status: status || 'Active',
    };

    const clerk = await User.create(clerkData);

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_CLERK',
      details: `Created clerk account for ${name} (${trimmedEmail}).`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(clerk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create clerk account.' });
  }
}

export async function editClerk(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, phone, address, status } = req.body;

    const clerk = await User.findById(id);
    if (!clerk || clerk.role !== 'Clerk') {
      return res.status(404).json({ error: 'Clerk not found.' });
    }

    const updateData = { name, phone, address, status };
    if (email !== undefined) {
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email address is required for clerk.' });
      }
      const existing = await User.findOne({ email: email.trim() });
      if (existing && (existing.id !== id && existing._id?.toString() !== id)) {
        return res.status(400).json({ error: 'Email already registered by another account.' });
      }
      updateData.email = email.trim();
    }
    if (password && password.trim()) {
      const salt = bcryptjs.genSaltSync(10);
      updateData.password = bcryptjs.hashSync(password, salt);
    }

    const updated = await User.findByIdAndUpdate(id, updateData, { new: true });

    const tenantId = getTenantId(req) || clerk.tenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_CLERK',
      details: `Updated clerk account details for ${name || clerk.name}.`,
      timestamp: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update clerk.' });
  }
}

export async function deleteClerk(req, res) {
  try {
    const { id } = req.params;
    const clerk = await User.findById(id);
    if (!clerk || (clerk.role !== 'Clerk' && clerk.role?.toLowerCase() !== 'clerk')) {
      return res.status(404).json({ error: 'Clerk not found.' });
    }

    const tenantId = getTenantId(req) || clerk.tenantId || 'tenant_default_001';
    const now = new Date();
    const deletedBy = req.user ? (req.user.name || req.user.email) : 'Admin';

    await User.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: now,
      deletedBy
    });

    try {
      await AuditLog.create({
        tenantId,
        userId: req.user ? (req.user.id || req.user._id || 'admin_id') : 'admin_id',
        userName: req.user ? (req.user.name || 'Admin') : 'Admin',
        userRole: req.user ? (req.user.role || 'Admin') : 'Admin',
        action: 'DELETE_CLERK',
        details: `Soft deleted clerk account ${clerk.name} (${clerk.email}).`,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error('Audit log failed during delete clerk:', auditErr);
    }

    res.json({ message: 'Clerk account soft-deleted successfully.' });
  } catch (err) {
    console.error('Error deleting clerk:', err);
    res.status(500).json({ error: err.message || 'Failed to delete clerk.' });
  }
}

// --- SUPPLIERS ---
export async function getSuppliers(req, res) {
  try {
    const suppliers = await Supplier.find(buildTenantQuery(req, { isDeleted: { $ne: true } }));
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
}

export async function addSupplier(req, res) {
  try {
    const { name, email, password, phone, address, cnic, currentBalance } = req.body;
    const tenantId = getTenantId(req) || 'tenant_default_001';

    if (!name || !phone) {
      return res.status(400).json({ error: 'Please provide supplier name and phone number.' });
    }

    if (email && email.trim()) {
      const existingUser = await User.findOne({ email: email.trim() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
    }

    let hashedPassword = '';
    if (password && password.trim()) {
      const salt = bcryptjs.genSaltSync(10);
      hashedPassword = bcryptjs.hashSync(password, salt);
    }

    const userData = {
      tenantId,
      name,
      phone,
      address,
      role: 'Supplier',
      status: 'Active',
    };

    if (email && email.trim()) {
      userData.email = email.trim();
    }
    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    const user = await User.create(userData);

    const initBalance = Number(currentBalance) || 0;

    const supplier = await Supplier.create({
      tenantId,
      userId: user ? (user.id || user._id) : null,
      name,
      phone,
      address,
      cnic,
      currentBalance: initBalance,
      totalSupplied: 0,
      totalPaid: 0,
      remainingBalance: initBalance,
    });

    // Create initial ledger entry if balance is non-zero
    if (initBalance !== 0) {
      await Ledger.create({
        tenantId,
        partyId: supplier.id || supplier._id,
        partyType: 'Supplier',
        date: new Date().toISOString().split('T')[0],
        type: initBalance < 0 ? 'Credit' : 'Debit',
        amount: Math.abs(initBalance),
        balanceAfter: initBalance,
        description: 'Opening Balance',
      });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_SUPPLIER',
      details: `Created supplier ${name}${email ? ` and linked account ${email}` : ''}.`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create supplier profile.' });
  }
}

export async function editSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, phone, address, cnic, currentBalance } = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    // Update supplier info
    const updatedSupplier = await Supplier.findByIdAndUpdate(id, {
      name,
      phone,
      address,
      cnic,
      currentBalance: Number(currentBalance) !== undefined ? Number(currentBalance) : supplier.currentBalance,
      remainingBalance: Number(currentBalance) !== undefined ? Number(currentBalance) : supplier.remainingBalance,
    }, { new: true });

    // Update linked user info
    if (supplier.userId) {
      const userUpdate = { name, phone, address };
      if (email !== undefined) {
        if (email && email.trim()) {
          const duplicate = await User.findOne({ email: email.trim() });
          if (!duplicate || duplicate.id === supplier.userId || duplicate._id?.toString() === supplier.userId) {
            userUpdate.email = email.trim();
          }
        } else {
          userUpdate.email = '';
        }
      }
      if (password && password.trim()) {
        const salt = bcryptjs.genSaltSync(10);
        userUpdate.password = bcryptjs.hashSync(password, salt);
      }
      await User.findByIdAndUpdate(supplier.userId, userUpdate);
    }

    const tenantId = getTenantId(req) || supplier.tenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_SUPPLIER',
      details: `Updated supplier profile details for ${name || supplier.name}.`,
      timestamp: new Date().toISOString(),
    });

    res.json(updatedSupplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update supplier profile.' });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    const tenantId = getTenantId(req) || supplier.tenantId || 'tenant_default_001';
    const now = new Date();
    const deletedBy = req.user ? (req.user.name || req.user.email) : 'Admin';

    // Soft Delete linked User
    if (supplier.userId) {
      await User.findByIdAndUpdate(supplier.userId, {
        isDeleted: true,
        deletedAt: now,
        deletedBy
      });
    }

    // Soft Delete Supplier
    await Supplier.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: now,
      deletedBy
    });

    try {
      await AuditLog.create({
        tenantId,
        userId: req.user ? (req.user.id || req.user._id || 'admin_id') : 'admin_id',
        userName: req.user ? (req.user.name || 'Admin') : 'Admin',
        userRole: req.user ? (req.user.role || 'Admin') : 'Admin',
        action: 'DELETE_SUPPLIER',
        details: `Soft deleted supplier ${supplier.name} and disabled associated login account.`,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error('Audit log failed during delete supplier:', auditErr);
    }

    res.json({ message: 'Supplier soft-deleted successfully.' });
  } catch (err) {
    console.error('Error deleting supplier:', err);
    res.status(500).json({ error: err.message || 'Failed to delete supplier.' });
  }
}

// --- CUSTOMERS ---
export async function getCustomers(req, res) {
  try {
    const customers = await Customer.find(buildTenantQuery(req, { isDeleted: { $ne: true } }));
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
}

export async function addCustomer(req, res) {
  try {
    const { name, email, password, phone, address, referenceBy, currentBalance } = req.body;
    const tenantId = getTenantId(req) || 'tenant_default_001';

    if (!name || !phone) {
      return res.status(400).json({ error: 'Please provide customer name and phone number.' });
    }

    if (email && email.trim()) {
      const existingUser = await User.findOne({ email: email.trim() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
    }

    let hashedPassword = '';
    if (password && password.trim()) {
      const salt = bcryptjs.genSaltSync(10);
      hashedPassword = bcryptjs.hashSync(password, salt);
    }

    const userData = {
      tenantId,
      name,
      phone,
      address,
      role: 'Customer',
      status: 'Active',
    };

    if (email && email.trim()) {
      userData.email = email.trim();
    }
    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    const user = await User.create(userData);

    const initBalance = Number(currentBalance) || 0;

    const customer = await Customer.create({
      tenantId,
      userId: user ? (user.id || user._id) : null,
      name,
      phone,
      address,
      referenceBy: referenceBy || '',
      currentBalance: initBalance,
      totalPurchases: 0,
      totalPaid: 0,
      remainingBalance: initBalance,
    });

    // Opening ledger entry
    if (initBalance !== 0) {
      await Ledger.create({
        tenantId,
        partyId: customer.id || customer._id,
        partyType: 'Customer',
        date: new Date().toISOString().split('T')[0],
        type: initBalance > 0 ? 'Debit' : 'Credit',
        amount: Math.abs(initBalance),
        balanceAfter: initBalance,
        description: 'Opening Balance',
      });
    }

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_CUSTOMER',
      details: `Created customer ${name}${email ? ` and linked account ${email}` : ''}.`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
}

export async function editCustomer(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, phone, address, referenceBy, currentBalance } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Update customer info
    const updatedCustomer = await Customer.findByIdAndUpdate(id, {
      name,
      phone,
      address,
      referenceBy: referenceBy !== undefined ? referenceBy : customer.referenceBy,
      currentBalance: Number(currentBalance) !== undefined ? Number(currentBalance) : customer.currentBalance,
      remainingBalance: Number(currentBalance) !== undefined ? Number(currentBalance) : customer.remainingBalance,
    }, { new: true });

    // Update linked user
    if (customer.userId) {
      const userUpdate = { name, phone, address };
      if (email !== undefined) {
        if (email && email.trim()) {
          const duplicate = await User.findOne({ email: email.trim() });
          if (!duplicate || duplicate.id === customer.userId || duplicate._id?.toString() === customer.userId) {
            userUpdate.email = email.trim();
          }
        } else {
          userUpdate.email = '';
        }
      }
      if (password && password.trim()) {
        const salt = bcryptjs.genSaltSync(10);
        userUpdate.password = bcryptjs.hashSync(password, salt);
      }
      await User.findByIdAndUpdate(customer.userId, userUpdate);
    }

    const tenantId = getTenantId(req) || customer.tenantId || 'tenant_default_001';

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EDIT_CUSTOMER',
      details: `Updated customer profile details for ${name || customer.name}.`,
      timestamp: new Date().toISOString(),
    });

    res.json(updatedCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
}

export async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const tenantId = getTenantId(req) || customer.tenantId || 'tenant_default_001';
    const now = new Date();
    const deletedBy = req.user ? (req.user.name || req.user.email) : 'Admin';

    if (customer.userId) {
      await User.findByIdAndUpdate(customer.userId, {
        isDeleted: true,
        deletedAt: now,
        deletedBy
      });
    }

    await Customer.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: now,
      deletedBy
    });

    try {
      await AuditLog.create({
        tenantId,
        userId: req.user ? (req.user.id || req.user._id || 'admin_id') : 'admin_id',
        userName: req.user ? (req.user.name || 'Admin') : 'Admin',
        userRole: req.user ? (req.user.role || 'Admin') : 'Admin',
        action: 'DELETE_CUSTOMER',
        details: `Soft deleted customer ${customer.name} and disabled associated login account.`,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error('Audit log failed during delete customer:', auditErr);
    }

    res.json({ message: 'Customer soft-deleted successfully.' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: err.message || 'Failed to delete customer.' });
  }
}

// --- DELETED USERS / TRASH & RESTORE ---

export async function getDeletedUsers(req, res) {
  try {
    const tenantQuery = buildTenantQuery(req, { isDeleted: true });

    const [deletedUsers, deletedSuppliers, deletedCustomers, deletedEmployees] = await Promise.all([
      User.find(tenantQuery),
      Supplier.find(tenantQuery),
      Customer.find(tenantQuery),
      Employee.find(tenantQuery)
    ]);

    const result = [];
    const handledUserIds = new Set();

    // 1. Process Suppliers
    for (const s of deletedSuppliers) {
      if (s.userId) handledUserIds.add(s.userId.toString());
      result.push({
        id: s.id || s._id,
        entityId: s.id || s._id,
        userId: s.userId,
        name: s.name,
        role: 'Supplier',
        userType: 'Supplier',
        phone: s.phone || 'N/A',
        email: 'N/A',
        deletedAt: s.deletedAt || s.updatedAt,
        deletedBy: s.deletedBy || 'Admin',
        entityType: 'Supplier',
      });
    }

    // 2. Process Customers
    for (const c of deletedCustomers) {
      if (c.userId) handledUserIds.add(c.userId.toString());
      result.push({
        id: c.id || c._id,
        entityId: c.id || c._id,
        userId: c.userId,
        name: c.name,
        role: 'Customer',
        userType: 'Customer',
        phone: c.phone || 'N/A',
        email: 'N/A',
        deletedAt: c.deletedAt || c.updatedAt,
        deletedBy: c.deletedBy || 'Admin',
        entityType: 'Customer',
      });
    }

    // 3. Process Employees
    for (const e of deletedEmployees) {
      result.push({
        id: e.id || e._id,
        entityId: e.id || e._id,
        name: e.name,
        role: e.designation || 'Employee',
        userType: 'Employee',
        phone: e.phone || 'N/A',
        email: e.email || 'N/A',
        deletedAt: e.deletedAt || e.updatedAt,
        deletedBy: e.deletedBy || 'Admin',
        entityType: 'Employee',
      });
    }

    // 4. Process User Accounts (e.g. Clerks, Admins)
    for (const u of deletedUsers) {
      const uId = (u.id || u._id).toString();
      if (handledUserIds.has(uId)) {
        // Link email to supplier/customer entry
        const existingItem = result.find(r => r.userId?.toString() === uId);
        if (existingItem && u.email) {
          existingItem.email = u.email;
        }
        continue;
      }
      result.push({
        id: uId,
        entityId: uId,
        name: u.name,
        role: u.role || 'Clerk',
        userType: u.role || 'Clerk',
        phone: u.phone || 'N/A',
        email: u.email || 'N/A',
        deletedAt: u.deletedAt || u.updatedAt,
        deletedBy: u.deletedBy || 'Admin',
        entityType: 'User',
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in getDeletedUsers:', err);
    res.status(500).json({ error: 'Failed to fetch deleted users.' });
  }
}

export async function restoreUser(req, res) {
  try {
    const { id } = req.params;
    const { entityType } = req.body || {};
    const tenantId = getTenantId(req) || 'tenant_default_001';

    let targetType = entityType;
    let restoredName = '';

    // Auto-detect entity type if not provided
    if (!targetType) {
      const supplier = await Supplier.findById(id);
      if (supplier) targetType = 'Supplier';
      else {
        const customer = await Customer.findById(id);
        if (customer) targetType = 'Customer';
        else {
          const employee = await Employee.findById(id);
          if (employee) targetType = 'Employee';
          else targetType = 'User';
        }
      }
    }

    if (targetType === 'Supplier') {
      const supplier = await Supplier.findById(id);
      if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });
      restoredName = supplier.name;

      await Supplier.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null });
      if (supplier.userId) {
        const user = await User.findById(supplier.userId);
        if (user && user.email) {
          const activeUser = await User.findOne({
            email: user.email.trim(),
            isDeleted: { $ne: true },
            _id: { $ne: user.id || user._id }
          });
          if (activeUser) {
            return res.status(400).json({ error: `Cannot restore: an active user with email "${user.email}" already exists.` });
          }
        }
        if (user) {
          await User.findByIdAndUpdate(supplier.userId, { isDeleted: false, deletedAt: null, deletedBy: null });
        }
      }
    } else if (targetType === 'Customer') {
      const customer = await Customer.findById(id);
      if (!customer) return res.status(404).json({ error: 'Customer not found.' });
      restoredName = customer.name;

      await Customer.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null });
      if (customer.userId) {
        const user = await User.findById(customer.userId);
        if (user && user.email) {
          const activeUser = await User.findOne({
            email: user.email.trim(),
            isDeleted: { $ne: true },
            _id: { $ne: user.id || user._id }
          });
          if (activeUser) {
            return res.status(400).json({ error: `Cannot restore: an active user with email "${user.email}" already exists.` });
          }
        }
        if (user) {
          await User.findByIdAndUpdate(customer.userId, { isDeleted: false, deletedAt: null, deletedBy: null });
        }
      }
    } else if (targetType === 'Employee') {
      const employee = await Employee.findById(id);
      if (!employee) return res.status(404).json({ error: 'Employee not found.' });
      restoredName = employee.name;

      await Employee.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null });
    } else {
      // User account (e.g. Clerk / Admin)
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      restoredName = user.name;

      if (user.email) {
        const activeUser = await User.findOne({
          email: user.email.trim(),
          isDeleted: { $ne: true },
          _id: { $ne: user.id || user._id }
        });
        if (activeUser) {
          return res.status(400).json({ error: `Cannot restore: an active user with email "${user.email}" already exists.` });
        }
      }

      await User.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null });

      // Restore linked Supplier or Customer if exists
      const linkedSupplier = await Supplier.findOne({ userId: id });
      if (linkedSupplier) {
        await Supplier.findByIdAndUpdate(linkedSupplier.id || linkedSupplier._id, { isDeleted: false, deletedAt: null, deletedBy: null });
      }
      const linkedCustomer = await Customer.findOne({ userId: id });
      if (linkedCustomer) {
        await Customer.findByIdAndUpdate(linkedCustomer.id || linkedCustomer._id, { isDeleted: false, deletedAt: null, deletedBy: null });
      }
    }

    await AuditLog.create({
      tenantId,
      userId: req.user ? req.user.id : 'system',
      userName: req.user ? req.user.name : 'Admin',
      userRole: req.user ? req.user.role : 'Admin',
      action: 'RESTORE_USER',
      details: `Restored ${targetType} account: ${restoredName}.`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `${targetType} "${restoredName}" restored successfully.` });
  } catch (err) {
    console.error('Error restoring user:', err);
    res.status(500).json({ error: 'Failed to restore user.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const now = new Date();
    const deletedBy = req.user ? (req.user.name || req.user.email) : 'Admin';
    const tenantId = getTenantId(req) || 'tenant_default_001';

    let deletedName = '';
    let found = false;

    // 1. Try User model
    const user = await User.findById(id);
    if (user) {
      found = true;
      deletedName = user.name || user.email;
      await User.findByIdAndUpdate(id, { isDeleted: true, deletedAt: now, deletedBy });

      const linkedSupplier = await Supplier.findOne({ userId: id });
      if (linkedSupplier) {
        await Supplier.findByIdAndUpdate(linkedSupplier.id || linkedSupplier._id, { isDeleted: true, deletedAt: now, deletedBy });
      }
      const linkedCustomer = await Customer.findOne({ userId: id });
      if (linkedCustomer) {
        await Customer.findByIdAndUpdate(linkedCustomer.id || linkedCustomer._id, { isDeleted: true, deletedAt: now, deletedBy });
      }
    }

    // 2. Try Supplier model
    if (!found) {
      const supplier = await Supplier.findById(id);
      if (supplier) {
        found = true;
        deletedName = supplier.name;
        await Supplier.findByIdAndUpdate(id, { isDeleted: true, deletedAt: now, deletedBy });
        if (supplier.userId) {
          await User.findByIdAndUpdate(supplier.userId, { isDeleted: true, deletedAt: now, deletedBy });
        }
      }
    }

    // 3. Try Customer model
    if (!found) {
      const customer = await Customer.findById(id);
      if (customer) {
        found = true;
        deletedName = customer.name;
        await Customer.findByIdAndUpdate(id, { isDeleted: true, deletedAt: now, deletedBy });
        if (customer.userId) {
          await User.findByIdAndUpdate(customer.userId, { isDeleted: true, deletedAt: now, deletedBy });
        }
      }
    }

    // 4. Try Employee model
    if (!found) {
      const employee = await Employee.findById(id);
      if (employee) {
        found = true;
        deletedName = employee.name;
        await Employee.findByIdAndUpdate(id, { isDeleted: true, deletedAt: now, deletedBy });
      }
    }

    if (!found) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    try {
      await AuditLog.create({
        tenantId,
        userId: req.user ? (req.user.id || req.user._id || 'admin_id') : 'admin_id',
        userName: req.user ? (req.user.name || 'Admin') : 'Admin',
        userRole: req.user ? (req.user.role || 'Admin') : 'Admin',
        action: 'DELETE_USER',
        details: `Soft deleted user account: ${deletedName} (ID: ${id}).`,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error('AuditLog failed during deleteUser:', auditErr);
    }

    res.json({ message: `User "${deletedName}" soft-deleted successfully.` });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}
