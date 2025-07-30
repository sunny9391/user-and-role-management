const express = require('express');
const router = express.Router();
const Permission = require('../models/permission');
const Activity = require("../models/activity");
const authenticate = require("../middleware/auth");
const Role = require("../models/role");

router.get('/', async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { key, description, roles } = req.body;

    const permission = new Permission({
      key,
      description,
      roles: Array.isArray(roles) ? roles : []
    });

    await permission.save();

    if (roles && roles.length > 0) {
      await Role.updateMany(
        { name: { $in: roles } },
        { $addToSet: { permissions: permission.key } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Created Permission",
      target: `Permission: ${permission.key}`
    });

    res.status(201).json({ permission, needsRefresh: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Permission key already exists." });
    }
    res.status(500).json({ error: "Failed to create permission" });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const permissionId = req.params.id;
    const { key, description, roles: newRoles } = req.body;

    const existingPermission = await Permission.findById(permissionId);
    if (!existingPermission) {
      return res.status(404).json({ error: "Permission not found" });
    }
    const oldRoles = existingPermission.roles || [];

    const updatedPermission = await Permission.findByIdAndUpdate(
      permissionId,
      { key, description, roles: Array.isArray(newRoles) ? newRoles : [] },
      { new: true }
    );

    const addedRoles = (Array.isArray(newRoles) ? newRoles : []).filter(r => !oldRoles.includes(r));
    const removedRoles = oldRoles.filter(r => !(Array.isArray(newRoles) ? newRoles : []).includes(r));

    if (addedRoles.length > 0) {
      await Role.updateMany(
        { name: { $in: addedRoles } },
        { $addToSet: { permissions: updatedPermission.key } }
      );
    }

    if (removedRoles.length > 0) {
      await Role.updateMany(
        { name: { $in: removedRoles } },
        { $pull: { permissions: updatedPermission.key } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Updated Permission",
      target: `Permission: ${updatedPermission.key}`
    });

    res.json({ updatedPermission, needsRefresh: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Permission key already exists." });
    }
    res.status(500).json({ error: "Failed to update permission" });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const permissionId = req.params.id;

    const permissionToDelete = await Permission.findById(permissionId);
    if (!permissionToDelete) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    await Permission.findByIdAndDelete(permissionId);

    if (permissionToDelete.roles && permissionToDelete.roles.length > 0) {
      await Role.updateMany(
        { name: { $in: permissionToDelete.roles } },
        { $pull: { permissions: permissionToDelete.key } }
      );
    }

    await Activity.create({
      userId: req.userId,
      action: "Deleted Permission",
      target: `Permission: ${permissionToDelete.key}`
    });

    res.json({ message: 'Permission deleted', needsRefresh: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete permission" });
  }
});

module.exports = router;