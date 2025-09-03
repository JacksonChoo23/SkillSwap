const sanitizeHtml = require('sanitize-html');

class ModerationService {
  constructor() {
    // Basic bad word filter (in production, use a more comprehensive list)
    this.badWords = [
      'spam', 'scam', 'fake', 'fraud', 'inappropriate',
      'offensive', 'abuse', 'harassment', 'bully'
    ];
  }

  sanitizeContent(content) {
    return sanitizeHtml(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      allowedAttributes: {
        'a': ['href']
      },
      allowedIframeHostnames: []
    });
  }

  checkForBadWords(content) {
    const lowerContent = content.toLowerCase();
    const foundWords = [];

    for (const word of this.badWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        foundWords.push(word);
      }
    }

    return {
      hasBadWords: foundWords.length > 0,
      badWords: foundWords
    };
  }

  moderateContent(content) {
    const sanitizedContent = this.sanitizeContent(content);
    const badWordCheck = this.checkForBadWords(sanitizedContent);

    return {
      content: sanitizedContent,
      isFlagged: badWordCheck.hasBadWords,
      flags: badWordCheck.badWords,
      needsReview: badWordCheck.hasBadWords
    };
  }

  validateMessageContent(content) {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    if (content.length > 2000) {
      return { isValid: false, error: 'Message too long (max 2000 characters)' };
    }

    const moderation = this.moderateContent(content);
    
    return {
      isValid: true,
      content: moderation.content,
      isFlagged: moderation.isFlagged,
      needsReview: moderation.needsReview
    };
  }

  validateListingContent(title, description) {
    const errors = [];

    if (!title || title.trim().length < 5) {
      errors.push('Title must be at least 5 characters long');
    }

    if (!description || description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (title && title.length > 255) {
      errors.push('Title too long (max 255 characters)');
    }

    if (description && description.length > 2000) {
      errors.push('Description too long (max 2000 characters)');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const titleModeration = this.moderateContent(title);
    const descriptionModeration = this.moderateContent(description);

    return {
      isValid: true,
      title: titleModeration.content,
      description: descriptionModeration.content,
      isFlagged: titleModeration.isFlagged || descriptionModeration.isFlagged,
      needsReview: titleModeration.needsReview || descriptionModeration.needsReview
    };
  }
}

module.exports = new ModerationService(); 