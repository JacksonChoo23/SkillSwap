const express = require('express');
const { Listing, User } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const moderationService = require('../services/moderationService');

const router = express.Router();

// List all approved listings
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { status: 'approved' },
      include: [{ model: User, attributes: ['id', 'name', 'location'] }],
      order: [['createdAt', 'DESC']]
    });

    res.render('listings/index', {
      title: 'Skill Listings - SkillSwap MY',
      listings
    });
  } catch (error) {
    console.error('Listings error:', error);
    req.session.error = 'Error loading listings.';
    res.redirect('/');
  }
});

// Create listing page
router.get('/create', (req, res) => {
  if (!req.isAuthenticated()) {
    req.session.error = 'Please log in to create a listing.';
    return res.redirect('/auth/login');
  }
  
  res.render('listings/create', {
    title: 'Create Listing - SkillSwap MY'
  });
});

// Create listing POST
router.post('/create', validate(schemas.listing), async (req, res) => {
  try {
    const { title, description } = req.body;

    // Moderate content
    const moderation = moderationService.validateListingContent(title, description);
    if (!moderation.isValid) {
      req.session.error = moderation.errors.join(', ');
      return res.redirect('/listings/create');
    }

    const listing = await Listing.create({
      userId: req.user.id,
      title: moderation.title,
      description: moderation.description,
      status: moderation.needsReview ? 'pending' : 'approved'
    });

    req.session.success = moderation.needsReview 
      ? 'Listing submitted for approval.' 
      : 'Listing created successfully.';
    res.redirect('/listings');
  } catch (error) {
    console.error('Create listing error:', error);
    req.session.error = 'Error creating listing.';
    res.redirect('/listings/create');
  }
});

// View listing detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await Listing.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'name', 'bio', 'location'] }]
    });

    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }

    if (listing.status !== 'approved' && (!req.isAuthenticated() || req.user.id !== listing.userId)) {
      req.session.error = 'Listing not available.';
      return res.redirect('/listings');
    }

    res.render('listings/detail', {
      title: `${listing.title} - SkillSwap MY`,
      listing
    });
  } catch (error) {
    console.error('Listing detail error:', error);
    req.session.error = 'Error loading listing.';
    res.redirect('/listings');
  }
});

// Edit listing page
router.get('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await Listing.findByPk(id);
    
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }

    if (req.user.id !== listing.userId) {
      req.session.error = 'You can only edit your own listings.';
      return res.redirect('/listings');
    }

    res.render('listings/edit', {
      title: 'Edit Listing - SkillSwap MY',
      listing
    });
  } catch (error) {
    console.error('Edit listing error:', error);
    req.session.error = 'Error loading listing.';
    res.redirect('/listings');
  }
});

// Update listing
router.post('/:id/edit', validate(schemas.listing), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    const listing = await Listing.findByPk(id);
    
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }

    if (req.user.id !== listing.userId) {
      req.session.error = 'You can only edit your own listings.';
      return res.redirect('/listings');
    }

    // Moderate content
    const moderation = moderationService.validateListingContent(title, description);
    if (!moderation.isValid) {
      req.session.error = moderation.errors.join(', ');
      return res.redirect(`/listings/${id}/edit`);
    }

    await listing.update({
      title: moderation.title,
      description: moderation.description,
      status: moderation.needsReview ? 'pending' : 'approved'
    });

    req.session.success = moderation.needsReview 
      ? 'Listing updated and submitted for approval.' 
      : 'Listing updated successfully.';
    res.redirect(`/listings/${id}`);
  } catch (error) {
    console.error('Update listing error:', error);
    req.session.error = 'Error updating listing.';
    res.redirect('/listings');
  }
});

// Delete listing
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await Listing.findByPk(id);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (req.user.id !== listing.userId) {
      return res.status(403).json({ error: 'You can only delete your own listings.' });
    }

    await listing.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Error deleting listing.' });
  }
});

module.exports = router; 