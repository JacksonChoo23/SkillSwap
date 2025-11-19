const express = require('express');
const { Listing, User, Skill, UserSkill, SavedSuggestion } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const { isAuthenticated } = require('../middlewares/auth');
const { checkAdultAndToxicContent, generateListingSuggestions } = require('../../utils/geminiModeration');

const router = express.Router();

// 工具：读取用户可以教的技能列表
const loadUserTeachingSkills = async (userId) => {
  const userSkills = await UserSkill.findAll({
    where: { userId, type: 'teach' },
    include: [{
      model: Skill,
      attributes: ['id', 'name']
    }],
    order: [[Skill, 'name', 'ASC']]
  });
  
  return userSkills.map(us => us.Skill);
};

// 工具：读取用户想学的技能列表
const loadUserLearningSkills = async (userId) => {
  const userSkills = await UserSkill.findAll({
    where: { userId, type: 'learn' },
    include: [{
      model: Skill,
      attributes: ['id', 'name']
    }],
    order: [[Skill, 'name', 'ASC']]
  });
  
  return userSkills.map(us => us.Skill);
};

// 列表页（只看 active）
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { status: 'active' },
      include: [
        { model: User, attributes: ['id', 'name', 'location'] },
        { model: Skill, as: 'Skill', attributes: ['id', 'name'] },
        { model: Skill, as: 'LearnSkill', attributes: ['id', 'name'] }
      ],
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

// 创建页
router.get('/create', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const teachSkills = await loadUserTeachingSkills(userId);
    const learnSkills = await loadUserLearningSkills(userId);
    
    // Get user's skills for AI suggestions
    let aiSuggestions = null;
    
    if (userId) {
      try {
        // Fetch user's full information including location
        const user = await User.findByPk(userId, {
          attributes: ['id', 'name', 'location']
        });
        
        // Fetch user's skills
        const userSkills = await UserSkill.findAll({
          where: { userId },
          include: [{ model: Skill, attributes: ['id', 'name'] }]
        });
        
        // Generate AI suggestions with user context
        const suggestions = await generateListingSuggestions(userSkills, 'teach', { user });
        aiSuggestions = suggestions.suggestions;
      } catch (suggestionError) {
        console.error('AI suggestion error:', suggestionError);
        // Continue without suggestions if AI fails
      }
    }
    
    res.render('listings/create', {
      title: 'Create Listing',
      teachSkills,
      learnSkills,
      moderationFlagged: null,
      successMessage: null,
      form: null,
      aiSuggestions,
      aiRewrite: null
    });
  } catch (e) {
    console.error('Load skills error:', e);
    req.session.error = 'Failed to load skills.';
    res.redirect('/listings');
  }
});

// AI Suggestions endpoint
router.get('/ai-suggestions', isAuthenticated, async (req, res) => {
  try {
    // Set no-cache headers to ensure fresh suggestions every time
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const userId = req.user?.id || req.session?.user?.id;
    const listingType = req.query.type || 'teach'; // 'teach' or 'learn'
    const teachSkillId = req.query.teach_skill_id;
    const learnSkillId = req.query.learn_skill_id;
    
    if (!userId) {
      return res.json({ error: 'User not authenticated' });
    }
    
    // Fetch user's full information including location
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'location']
    });
    
    // Build skills array based on selected skill IDs from form
    const userSkills = [];
    
    if (teachSkillId) {
      const teachSkill = await Skill.findByPk(teachSkillId, {
        attributes: ['id', 'name']
      });
      if (teachSkill) {
        userSkills.push({
          type: 'teach',
          Skill: teachSkill
        });
      }
    }
    
    if (learnSkillId) {
      const learnSkill = await Skill.findByPk(learnSkillId, {
        attributes: ['id', 'name']
      });
      if (learnSkill) {
        userSkills.push({
          type: 'learn',
          Skill: learnSkill
        });
      }
    }
    
    // If no skills selected, fall back to user's profile skills
    if (userSkills.length === 0) {
      const profileSkills = await UserSkill.findAll({
        where: { userId },
        include: [{ model: Skill, attributes: ['id', 'name'] }]
      });
      userSkills.push(...profileSkills);
    }
    
    // Generate AI suggestions with user context
    const result = await generateListingSuggestions(userSkills, listingType, { user });
    res.json(result);
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.json({ 
      suggestions: {
        title: "",
        description: "",
        notes: ["Unable to generate suggestions at this time. Please try again later."]
      }
    });
  }
});

// 创建提交
router.post('/create', isAuthenticated, async (req, res) => {
  const refill = async (opts = {}) => {
    const userId = req.user?.id || req.session?.user?.id;
    const teachSkills = await loadUserTeachingSkills(userId);
    const learnSkills = await loadUserLearningSkills(userId);
    return res.render('listings/create', {
      title: 'Create Listing',
      teachSkills,
      learnSkills,
      moderationFlagged: opts.moderationFlagged || null,
      successMessage: null,
      form: {
        title: req.body.title || '',
        description: req.body.description || '',
        skill_id: req.body.skill_id || req.body.skillId || '',
        learn_skill_id: req.body.learn_skill_id || req.body.learnSkillId || '',
        visibility: req.body.visibility || 'public'
      },
      aiSuggestions: opts.aiSuggestions || null,
      aiRewrite: opts.aiRewrite || null
    });
  };

  try {
    const {
      title,
      description,
      skill_id,
      skillId,
      learn_skill_id,
      learnSkillId,
      visibility
    } = req.body;

    if (!title || !description) {
      return refill({ moderationFlagged: { message: 'Title and description are required', scores: {} } });
    }

    // 审核
    try {
      const moderationResult = await checkAdultAndToxicContent([title, description].join('\n'));
      if (moderationResult.isAdult || moderationResult.isToxic) {
        return refill({
          moderationFlagged: { message: 'Content flagged', scores: moderationResult.scores }
        });
      }
    } catch (e) {
      console.error('Moderation failed:', String(e).slice(0, 200));
      if (process.env.MODERATION_ALLOW_ON_FAIL !== '1') {
        return refill({
          moderationFlagged: { message: 'Moderation unavailable', scores: {} }
        });
      }
    }

    // 用户
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return refill({ moderationFlagged: { message: 'User not authenticated', scores: {} } });
    }

    // 技能 - 验证用户确实拥有此教学技能
    const chosenSkillId = Number(skill_id || skillId);
    if (!chosenSkillId) {
      return refill({ moderationFlagged: { message: 'Please select a skill to teach', scores: {} } });
    }
    
    // 验证用户在 user_skills 表中有这个技能并且类型是 teach
    const userSkill = await UserSkill.findOne({
      where: { userId, skillId: chosenSkillId, type: 'teach' }
    });
    
    if (!userSkill) {
      return refill({ moderationFlagged: { message: 'You can only create listings for skills you can teach. Please add this skill to your profile first.', scores: {} } });
    }

    // 验证想学的技能（如果提供）
    // 验证想学的技能（必须提供）
    const chosenLearnSkillId = Number(learn_skill_id || learnSkillId);
    if (!chosenLearnSkillId) {
      return refill({ moderationFlagged: { message: 'Please select a skill you want to learn', scores: {} } });
    }
    if (chosenLearnSkillId) {
      const userLearnSkill = await UserSkill.findOne({
        where: { userId, skillId: chosenLearnSkillId, type: 'learn' }
      });
      
      if (!userLearnSkill) {
        return refill({ moderationFlagged: { message: 'You can only select skills you want to learn from your profile.', scores: {} } });
      }
    }

    // 创建（status 用 active）
    await Listing.create({
      userId,
      skillId: chosenSkillId,
      learnSkillId: chosenLearnSkillId,
      title: String(title).trim(),
      description: String(description).trim(),
      visibility: visibility || 'public',
      status: 'active'
    });

    req.session.success = 'Listing created successfully!';
    res.redirect('/listings');
  } catch (e) {
    console.error('Create listing error:', e);
    return refill({ moderationFlagged: { message: 'Server error', scores: {} } });
  }
});

// 详情页
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name', 'bio', 'location', 'whatsapp_number'] },
        { model: Skill, as: 'Skill', attributes: ['id', 'name'] },
        { model: Skill, as: 'LearnSkill', attributes: ['id', 'name'] }
      ]
    });

    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }

    const ownerId = req.user?.id || req.session?.user?.id;
    if (listing.status !== 'active' && ownerId !== listing.userId) {
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

// 编辑页
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.session?.user?.id;
    const listing = await Listing.findByPk(id);
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }
    if (userId !== listing.userId) {
      req.session.error = 'You can only edit your own listings.';
      return res.redirect('/listings');
    }
    const teachSkills = await loadUserTeachingSkills(userId);
    const learnSkills = await loadUserLearningSkills(userId);
    res.render('listings/edit', { 
      title: 'Edit Listing - SkillSwap MY', 
      listing, 
      teachSkills,
      learnSkills 
    });
  } catch (error) {
    console.error('Edit listing error:', error);
    req.session.error = 'Error loading listing.';
    res.redirect('/listings');
  }
});

// 保存编辑
router.post('/:id/edit', isAuthenticated, validate(schemas.listing), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, skill_id, skillId, learn_skill_id, learnSkillId, visibility } = req.body;

    try {
      const moderationResult = await checkAdultAndToxicContent(description || '');
      if (moderationResult.isAdult || moderationResult.isToxic) {
        req.session.error = 'Content flagged.';
        return res.redirect(`/listings/${id}/edit`);
      }
    } catch (e) {
      console.error('Moderation failed (non-JSON):', String(e).slice(0, 300));
      if (process.env.MODERATION_ALLOW_ON_FAIL !== '1') {
        req.session.error = 'Moderation unavailable.';
        return res.redirect(`/listings/${id}/edit`);
      }
    }

    const userId = req.user?.id || req.session?.user?.id;
    const listing = await Listing.findByPk(id);
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/listings');
    }
    if (userId !== listing.userId) {
      req.session.error = 'You can only edit your own listings.';
      return res.redirect('/listings');
    }

    const chosenSkillId = Number(skill_id || skillId) || listing.skillId;

    // Optional learn skill
    const chosenLearnSkillIdRaw = (learn_skill_id ?? learnSkillId);
    const chosenLearnSkillId = Number(chosenLearnSkillIdRaw || listing.learnSkillId);
    if (!chosenLearnSkillId) {
      req.session.error = 'Please select a skill you want to learn.';
      return res.redirect(`/listings/${id}/edit`);
    }
    
    // 验证用户在 user_skills 表中有这个技能并且类型是 teach
    if (chosenSkillId) {
      const userSkill = await UserSkill.findOne({
        where: { userId, skillId: chosenSkillId, type: 'teach' }
      });
      
      if (!userSkill) {
        req.session.error = 'You can only list skills you can teach. Please add this skill to your profile first.';
        return res.redirect(`/listings/${id}/edit`);
      }
    }

    // Validate learn skill (if explicitly set to a number)
    const userLearnSkill = await UserSkill.findOne({
      where: { userId, skillId: chosenLearnSkillId, type: 'learn' }
    });
    if (!userLearnSkill) {
      req.session.error = 'You can only select skills you want to learn from your profile.';
      return res.redirect(`/listings/${id}/edit`);
    }

    await listing.update({
      title,
      description,
      skillId: chosenSkillId,
      learnSkillId: chosenLearnSkillId,
      visibility: visibility || listing.visibility,
      status: 'active'
    });

    req.session.success = 'Listing updated successfully.';
    res.redirect(`/listings/${id}`);
  } catch (error) {
    console.error('Update listing error:', error);
    req.session.error = 'Error updating listing.';
    res.redirect('/listings');
  }
});

// 删除
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findByPk(id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if ((req.user?.id || req.session?.user?.id) !== listing.userId) {
      return res.status(403).json({ error: 'You can only delete your own listings.' });
    }
    await listing.destroy();
    req.session.success = 'Listing deleted successfully.';
    res.json({ success: true });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Error deleting listing.' });
  }
});

// Save AI suggestion
router.post('/save-suggestion', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { title, description, suggestion_type, skill_category, notes } = req.body;

    if (!title || !description || !suggestion_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const savedSuggestion = await SavedSuggestion.create({
      user_id: userId,
      title,
      description,
      suggestion_type,
      skill_category,
      notes: Array.isArray(notes) ? notes : []
    });

    res.json({ 
      success: true, 
      message: 'Suggestion saved successfully',
      suggestion: savedSuggestion
    });
  } catch (error) {
    console.error('Save suggestion error:', error);
    res.status(500).json({ error: 'Error saving suggestion' });
  }
});

// Get saved suggestions
router.get('/saved-suggestions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { type, favorites_only } = req.query;

    const where = { user_id: userId };
    if (type && ['teach', 'learn'].includes(type)) {
      where.suggestion_type = type;
    }
    if (favorites_only === 'true') {
      where.is_favorite = true;
    }

    const suggestions = await SavedSuggestion.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 20
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('Get saved suggestions error:', error);
    res.status(500).json({ error: 'Error fetching saved suggestions' });
  }
});

// Toggle favorite status
router.patch('/saved-suggestions/:id/favorite', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { id } = req.params;

    const suggestion = await SavedSuggestion.findOne({
      where: { id, user_id: userId }
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    suggestion.is_favorite = !suggestion.is_favorite;
    await suggestion.save();

    res.json({ 
      success: true, 
      is_favorite: suggestion.is_favorite 
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Error updating favorite status' });
  }
});

// Delete saved suggestion
router.delete('/saved-suggestions/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { id } = req.params;

    const result = await SavedSuggestion.destroy({
      where: { id, user_id: userId }
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Error deleting suggestion' });
  }
});

// Add a new notification when a skill match or request occurs
async function addNotification(userId, title, message) {
  const { Notification } = require('../models');
  await Notification.create({
    user_id: userId,
    title,
    message
  });
}

// API: Get all notifications for the logged-in user
router.get('/api/notifications', isAuthenticated, async (req, res) => {
  try {
    const { Notification } = require('../models');
    const userId = req.user?.id || req.session?.user?.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['status', 'ASC'], ['created_at', 'DESC']]
    });

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// API: Mark a notification as read
router.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    const { Notification } = require('../models');
    const userId = req.user?.id || req.session?.user?.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.status = 'read';
    await notification.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Error updating notification status' });
  }
});

// Route to render the notifications page
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    res.render('history/messages', { title: 'Notifications' });
  } catch (error) {
    console.error('Error rendering notifications page:', error);
    res.status(500).send('Error loading notifications page.');
  }
});

// Route to handle requests to /.well-known/appspecific/com.chrome.devtools.json
router.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = router;
