const express = require('express');
const router = express.Router();
const Role = require('../models/role');
const Activity = require('../models/activity');
const authenticate = require('../middleware/auth');
const Permission = require('../models/permission');

router.get('/', authenticate, async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, permissions: newPermissions, status, createdBy } = req.body;

    const role = new Role({
        name,
        permissions: Array.isArray(newPermissions) ? newPermissions : [],
        status,
        createdBy,
        users: 0,
        lastUpdated: new Date()
    });
    await role.save();

    if (newPermissions && newPermissions.length > 0) {
      await Permission.updateMany(
        { key: { $in: newPermissions } },
        { $addToSet: { roles: role.name } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Created Role",
      target: `Role: ${role.name}`
    });

    res.status(201).json({ role, needsRefresh: true });
  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ error: "Role name already exists." });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const roleId = req.params.id;
    const { name, permissions: newPermissions, status } = req.body;

    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: "Role not found" });
    }
    const oldPermissions = existingRole.permissions || [];

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      {
        name,
        permissions: Array.isArray(newPermissions) ? newPermissions : [],
        status,
        lastUpdated: new Date()
      },
      { new: true }
    );

    const addedPermissionsKeys = (Array.isArray(newPermissions) ? newPermissions : []).filter(p => !oldPermissions.includes(p));
    const removedPermissionsKeys = oldPermissions.filter(p => !(Array.isArray(newPermissions) ? newPermissions : []).includes(p));

    if (addedPermissionsKeys.length > 0) {
      await Permission.updateMany(
        { key: { $in: addedPermissionsKeys } },
        { $addToSet: { roles: updatedRole.name } }
      );
    }

    if (removedPermissionsKeys.length > 0) {
      await Permission.updateMany(
        { key: { $in: removedPermissionsKeys } },
        { $pull: { roles: updatedRole.name } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Updated Role",
      target: `Role: ${updatedRole.name}`
    });

    res.json({ updatedRole, needsRefresh: true });
  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ error: "Role name already exists." });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const roleId = req.params.id;

    const roleToDelete = await Role.findById(roleId);
    if (!roleToDelete) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await Role.findByIdAndDelete(roleId);

    if (roleToDelete.permissions && roleToDelete.permissions.length > 0) {
      await Permission.updateMany(
        { key: { $in: roleToDelete.permissions } },
        { $pull: { roles: roleToDelete.name } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Deleted Role",
      target: `Role: ${roleToDelete.name}`
    });

    res.json({ message: 'Role deleted', needsRefresh: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;