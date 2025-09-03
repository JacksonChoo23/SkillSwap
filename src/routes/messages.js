const express = require('express');
const { MessageThread, Message, User, Listing } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const moderationService = require('../services/moderationService');

const router = express.Router();

// List message threads
router.get('/', async (req, res) => {
  try {
    const threads = await MessageThread.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { creatorId: req.user.id },
          { participantId: req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'participant',
          attributes: ['id', 'name']
        },
        {
          model: Listing,
          attributes: ['id', 'title']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.render('messages/index', {
      title: 'Messages - SkillSwap MY',
      threads
    });
  } catch (error) {
    console.error('Messages error:', error);
    req.session.error = 'Error loading messages.';
    res.redirect('/');
  }
});

// View thread
router.get('/thread/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const thread = await MessageThread.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'participant',
          attributes: ['id', 'name']
        },
        {
          model: Listing,
          attributes: ['id', 'title']
        },
        {
          model: Message,
          as: 'messages',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'name']
          }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!thread) {
      req.session.error = 'Thread not found.';
      return res.redirect('/messages');
    }

    // Check if user is part of this thread
    if (thread.creatorId !== req.user.id && thread.participantId !== req.user.id) {
      req.session.error = 'Access denied.';
      return res.redirect('/messages');
    }

    res.render('messages/thread', {
      title: `Messages - ${thread.Listing.title} - SkillSwap MY`,
      thread
    });
  } catch (error) {
    console.error('Thread error:', error);
    req.session.error = 'Error loading thread.';
    res.redirect('/messages');
  }
});

// Send message
router.post('/thread/:id', validate(schemas.message), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const thread = await MessageThread.findByPk(id);
    
    if (!thread) {
      req.session.error = 'Thread not found.';
      return res.redirect('/messages');
    }

    // Check if user is part of this thread
    if (thread.creatorId !== req.user.id && thread.participantId !== req.user.id) {
      req.session.error = 'Access denied.';
      return res.redirect('/messages');
    }

    // Moderate content
    const moderation = moderationService.validateMessageContent(content);
    if (!moderation.isValid) {
      req.session.error = moderation.error;
      return res.redirect(`/messages/thread/${id}`);
    }

    await Message.create({
      threadId: id,
      senderId: req.user.id,
      content: moderation.content
    });

    // Update thread timestamp
    await thread.update({ updatedAt: new Date() });

    res.redirect(`/messages/thread/${id}`);
  } catch (error) {
    console.error('Send message error:', error);
    req.session.error = 'Error sending message.';
    res.redirect('/messages');
  }
});

// Start new thread
router.post('/start/:listingId', validate(schemas.message), async (req, res) => {
  try {
    const { listingId } = req.params;
    const { content } = req.body;
    
    const listing = await Listing.findByPk(listingId);
    
    if (!listing || listing.status !== 'approved') {
      req.session.error = 'Listing not found or not available.';
      return res.redirect('/listings');
    }

    if (listing.userId === req.user.id) {
      req.session.error = 'You cannot message yourself.';
      return res.redirect(`/listings/${listingId}`);
    }

    // Check if thread already exists
    let thread = await MessageThread.findOne({
      where: {
        listingId,
        creatorId: req.user.id,
        participantId: listing.userId
      }
    });

    if (!thread) {
      thread = await MessageThread.create({
        listingId,
        creatorId: req.user.id,
        participantId: listing.userId
      });
    }

    // Moderate content
    const moderation = moderationService.validateMessageContent(content);
    if (!moderation.isValid) {
      req.session.error = moderation.error;
      return res.redirect(`/listings/${listingId}`);
    }

    await Message.create({
      threadId: thread.id,
      senderId: req.user.id,
      content: moderation.content
    });

    req.session.success = 'Message sent successfully.';
    res.redirect(`/messages/thread/${thread.id}`);
  } catch (error) {
    console.error('Start thread error:', error);
    req.session.error = 'Error starting conversation.';
    res.redirect('/listings');
  }
});

module.exports = router; 