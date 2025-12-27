// utils/geminiModeration.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Bottleneck = require("bottleneck");

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let modelsAvailable = false;

// Initialize AI only if API key is available
if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    modelsAvailable = true;
    console.log('Gemini AI successfully initialized.');
  } catch (error) {
    console.warn('Failed to initialize Gemini AI:', error.message);
    modelsAvailable = false;
  }
} else {
  console.warn('GEMINI_API_KEY not configured. AI suggestions will use fallback content.');
}

let baseModel = null;
let suggestModel = null;

if (modelsAvailable) {
  baseModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
Output ONLY valid JSON. No fences. No prose.
Schema:
{
  "isAdult": boolean,
  "isToxic": boolean,
  "scores": {
    "sexual": number,
    "sexual_minors": number,
    "harassment": number,
    "hate": number,
    "self_harm": number,
    "violence": number
  },
  "reasons": string[]
}
Rules:
- isAdult = sexual >= 0.8 OR sexual_minors >= 0.2
- isToxic = harassment >= 0.8 OR hate >= 0.8 OR violence >= 0.8
`
  });

  suggestModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
You are an AI assistant helping users create skill exchange listings. Based on their profile skills, generate helpful suggestions.

Output ONLY valid JSON. No fences. No prose.
Schema:
{
  "suggestions": {
    "title": string,
    "description": string,
    "notes": string[]
  }
}

Guidelines:
- Suggest titles that are clear and specific about what they're offering/seeking
- Create descriptions that highlight the user's expertise and teaching style
- Include helpful tips in notes about what makes a good listing
- Keep suggestions professional and encouraging
- Title should be under 80 characters
- Description should be under 500 characters for suggestions
- Base suggestions on the user's actual skills they want to teach or learn
`
  });
}

const generationConfig = {
  responseMimeType: "application/json",
  temperature: 0,
  maxOutputTokens: 512
};

// Rate limiter: 1 request every 4 seconds (15 requests per minute max)
const limiter = new Bottleneck({
  minTime: 4000 // 4 seconds between requests
});

// Sleep utility for exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff retry wrapper
async function runModelWithRetry(model, prompt, cfg = generationConfig, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Attempt the API call
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: cfg
      });

      let raw = "";
      try {
        raw = res.response.text().trim();
      } catch {
        raw =
          res?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() || "";
      }

      // Clean up common JSON formatting issues from AI responses
      if (raw) {
        // Remove markdown code blocks if present
        raw = raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');

        // Remove any leading/trailing non-JSON content
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          raw = raw.substring(jsonStart, jsonEnd + 1);
        }

        // Fix common escape sequence issues
        raw = raw.replace(/\\\n/g, '\\n').replace(/\\\"/g, '\\"');
      }

      return raw;
    } catch (error) {
      // Check if it's a 429 (Too Many Requests) or 503 (Service Unavailable)
      const isRateLimitError = error.status === 429 || error.status === 503;
      const shouldRetry = isRateLimitError && i < retries - 1;

      if (shouldRetry) {
        // Wait longer for each retry (e.g., 2s, 4s, 8s)
        const delay = Math.pow(2, i) * 2000;
        console.warn(`Gemini API quota hit (${error.status}). Retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
        await sleep(delay);
      } else {
        // If it's a different error or we ran out of retries, throw it
        throw error;
      }
    }
  }
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

function shapeModeration(o = {}) {
  const s = o.scores || {};
  const sexual = num(s.sexual);
  const sexualMinors = num(s["sexual_minors"]);
  const harassment = num(s.harassment);
  const hate = num(s.hate);
  const selfHarm = num(s["self_harm"]);
  const violence = num(s.violence);

  const isAdult = sexual >= 0.8 || sexualMinors >= 0.2;
  const isToxic = harassment >= 0.8 || hate >= 0.8 || violence >= 0.8;

  return {
    isAdult,
    isToxic,
    scores: {
      sexual,
      sexual_minors: sexualMinors,
      harassment,
      hate,
      self_harm: selfHarm,
      violence
    },
    reasons: Array.isArray(o.reasons) ? o.reasons.slice(0, 10) : []
  };
}

// Safe JSON parsing with error handling
function safeJsonParse(jsonString, fallbackData = {}) {
  if (!jsonString || typeof jsonString !== 'string') {
    console.warn('Invalid JSON string provided to safeJsonParse');
    return fallbackData;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.warn('JSON parsing failed:', error.message);
    console.warn('Raw content:', jsonString.substring(0, 200) + '...');

    // Try to extract suggestions from malformed JSON
    try {
      // Look for title and description patterns in the response
      const titleMatch = jsonString.match(/"title"\s*:\s*"([^"]+)"/);
      const descriptionMatch = jsonString.match(/"description"\s*:\s*"([^"]+)"/);

      if (titleMatch || descriptionMatch) {
        return {
          suggestions: {
            title: titleMatch ? titleMatch[1] : '',
            description: descriptionMatch ? descriptionMatch[1] : '',
            notes: []
          }
        };
      }
    } catch (extractError) {
      console.warn('Failed to extract partial data:', extractError.message);
    }

    return fallbackData;
  }
}

// Wrap the retry function with rate limiter
async function runModel(model, prompt, cfg = generationConfig) {
  return limiter.schedule(() => runModelWithRetry(model, prompt, cfg));
}

// 保留：旧 API（只做判定）
async function checkAdultAndToxicContent(text) {
  const prompt = `Analyze the text and return ONLY JSON in the required schema.

Text:
"""${(text ?? "").toString().slice(0, 8000)}"""`;

  const raw = await runModel(baseModel, prompt);

  try {
    return shapeModeration(safeJsonParse(raw, {
      isAdult: false,
      isToxic: false,
      scores: { sexual: 0, sexual_minors: 0, harassment: 0, hate: 0, self_harm: 0, violence: 0 },
      reasons: []
    }));
  } catch (error) {
    console.error('Moderation parsing failed:', error);
    throw new Error("Gemini moderation: failed to parse response");
  }
}

// Skill category detection helper
const getSkillCategory = (skillName) => {
  const categories = {
    programming: ['javascript', 'python', 'java', 'react', 'node', 'php', 'css', 'html', 'sql', 'c++', 'c#', 'swift', 'kotlin', 'flutter', 'angular', 'vue', 'typescript', 'ruby', 'golang', 'rust', 'scala'],
    languages: ['english', 'chinese', 'malay', 'tamil', 'spanish', 'french', 'german', 'korean', 'japanese', 'arabic', 'hindi', 'portuguese', 'italian', 'russian'],
    arts: ['guitar', 'piano', 'violin', 'drawing', 'painting', 'photography', 'singing', 'dancing', 'sculpture', 'graphic design', 'digital art'],
    sports: ['football', 'basketball', 'tennis', 'swimming', 'badminton', 'volleyball', 'running', 'cycling', 'yoga', 'fitness', 'martial arts'],
    business: ['marketing', 'accounting', 'finance', 'sales', 'management', 'entrepreneurship', 'leadership', 'project management', 'excel', 'powerpoint'],
    academic: ['mathematics', 'physics', 'chemistry', 'biology', 'history', 'geography', 'economics', 'psychology', 'sociology', 'philosophy']
  };

  const skillLower = skillName.toLowerCase();
  for (const [category, skills] of Object.entries(categories)) {
    if (skills.some(skill => skillLower.includes(skill) || skill.includes(skillLower))) {
      return category;
    }
  }
  return 'general';
};

// Fallback suggestions for when AI is not available
const getFallbackSuggestions = (userSkills, listingType, context = {}) => {
  const teachSkills = (userSkills || []).filter(skill => skill.type === 'teach');
  const learnSkills = (userSkills || []).filter(skill => skill.type === 'learn');

  const relevantSkills = listingType === 'teach' ? teachSkills : learnSkills;
  const primarySkillData = relevantSkills[0];
  const primarySkill = primarySkillData?.Skill?.name || primarySkillData?.skillName;
  const primaryLevel = primarySkillData?.level || 'intermediate';
  const userLocation = context.user?.location;

  const skillCategory = primarySkill ? getSkillCategory(primarySkill) : 'general';

  const categorySpecificSuggestions = {
    programming: {
      teach: {
        titles: [
          "Expert {skill} Developer & Mentor",
          "Learn {skill} from Industry Professional",
          "Professional {skill} Coding Bootcamp",
          "{skill} Development Made Easy",
          "Senior {skill} Developer - Ready to Teach"
        ],
        descriptions: [
          "Experienced {skill} developer with {years}+ years in the industry. I specialize in clean code, best practices, and real-world project development. Perfect for beginners to advanced learners.",
          "Professional software engineer passionate about teaching {skill}. I focus on practical skills, debugging techniques, and building projects that showcase your abilities to employers.",
          "Senior {skill} developer offering personalized coding mentorship. From fundamentals to advanced concepts, I'll guide you through hands-on projects and industry best practices."
        ]
      },
      learn: {
        titles: [
          "Aspiring {skill} Developer Seeking Mentor",
          "Learn {skill} Development from Scratch",
          "Junior Developer Looking for {skill} Guidance",
          "Beginner in {skill} - Need Expert Help",
          "Career Changer Learning {skill} Development"
        ],
        descriptions: [
          "Motivated learner eager to master {skill} development. I'm committed to daily practice and looking for a mentor who can guide me through real-world projects and best practices.",
          "Complete beginner in {skill} but highly motivated! I learn quickly and am looking for patient instruction covering fundamentals, project building, and career guidance.",
          "Self-studying {skill} and need guidance from an experienced developer. I'm particularly interested in learning debugging skills and building portfolio projects."
        ]
      }
    },
    languages: {
      teach: {
        titles: [
          "Native {skill} Speaker & Certified Tutor",
          "Learn {skill} with Interactive Conversation",
          "Professional {skill} Language Instructor",
          "{skill} Tutor - All Levels Welcome",
          "Fluent {skill} Speaker Offering Lessons"
        ],
        descriptions: [
          "Native {skill} speaker with teaching certification. I offer conversational practice, grammar lessons, and cultural insights. Perfect for business, travel, or personal enrichment.",
          "Experienced {skill} tutor passionate about helping students achieve fluency. I use interactive methods, real-life scenarios, and personalized lesson plans for effective learning.",
          "Professional {skill} instructor with proven teaching methods. From basic conversation to advanced grammar, I adapt my teaching style to match your learning goals and pace."
        ]
      },
      learn: {
        titles: [
          "Eager to Learn {skill} Language",
          "Beginner {skill} Student Seeking Tutor",
          "Want to Master {skill} Conversation",
          "Learning {skill} for Travel/Business",
          "Passionate {skill} Language Learner"
        ],
        descriptions: [
          "Enthusiastic {skill} language learner seeking patient, encouraging tutor. I'm committed to regular practice and want to focus on practical conversation skills for daily use.",
          "Complete beginner in {skill} but very motivated! I learn best through conversation practice and real-life examples. Looking for a supportive teacher who can help build my confidence.",
          "Learning {skill} for upcoming travel/business opportunities. I need practical phrases, cultural context, and conversation practice to communicate effectively."
        ]
      }
    },
    arts: {
      teach: {
        titles: [
          "Professional {skill} Artist & Instructor",
          "Learn {skill} with Creative Expert",
          "Experienced {skill} Teacher Available",
          "{skill} Lessons - All Skill Levels",
          "Creative {skill} Mentor & Guide"
        ],
        descriptions: [
          "Professional {skill} artist with years of teaching experience. I help students develop technique, creativity, and personal style through structured lessons and encouraging guidance.",
          "Passionate {skill} instructor who believes everyone can be creative! I offer personalized lessons focusing on fundamentals, technique development, and artistic expression.",
          "Experienced {skill} teacher specializing in beginner-friendly instruction. I create a supportive environment where students can explore, learn, and develop their artistic abilities."
        ]
      },
      learn: {
        titles: [
          "Creative Soul Learning {skill}",
          "Beginner {skill} Student Seeking Teacher",
          "Want to Explore {skill} as Hobby",
          "Learning {skill} for Personal Growth",
          "New to {skill} - Need Patient Guide"
        ],
        descriptions: [
          "Creative beginner excited to learn {skill}! I'm looking for an encouraging teacher who can help me develop basic skills and discover my artistic potential in a supportive environment.",
          "Complete novice in {skill} but passionate about learning! I want to start with fundamentals and gradually build skills through patient guidance and regular practice.",
          "Learning {skill} as a personal enrichment journey. I'm looking for a mentor who can help me explore creativity and develop techniques at a comfortable, enjoyable pace."
        ]
      }
    }
  };

  const commonSuggestions = {
    teach: {
      titles: [
        "Expert {skill} Tutor Available",
        "Learn {skill} with Experienced Guide",
        "Professional {skill} Teaching Sessions",
        "{skill} Mentor Ready to Help",
        "Master {skill} - Let Me Teach You"
      ],
      descriptions: [
        "I have extensive experience in {skill} and love sharing knowledge with others. Whether you're a complete beginner or looking to advance your skills, I can help you achieve your goals.",
        "Passionate about {skill} and teaching! I offer personalized sessions tailored to your learning pace and style. Let's work together to build your confidence and expertise.",
        "Professional {skill} instructor with proven teaching methods. I focus on practical, hands-on learning that you can apply immediately. Ready to guide you on your learning journey!"
      ],
      notes: [
        "Clearly describe your experience level and teaching style",
        "Mention specific skills or topics you can cover",
        "Include what students can expect to achieve",
        "Add information about session format (online/in-person)",
        "Be specific about your availability and preferred schedule"
      ]
    },
    learn: {
      titles: [
        "Eager to Learn {skill} - Seeking Mentor",
        "Looking for {skill} Teacher/Guide",
        "Want to Master {skill} - Need Help!",
        "Beginner Seeking {skill} Instruction",
        "Ready to Learn {skill} from Expert"
      ],
      descriptions: [
        "I'm motivated to learn {skill} and looking for a patient, knowledgeable teacher. I'm committed to practicing and improving, and I value clear instruction and feedback.",
        "Seeking an experienced {skill} mentor who can guide me from basics to proficiency. I'm a dedicated learner who appreciates structured lessons and practical exercises.",
        "New to {skill} but very enthusiastic! Looking for someone who can teach fundamentals and help me build a strong foundation. Ready to put in the work!"
      ],
      notes: [
        "Be honest about your current skill level",
        "Mention your learning goals and timeline",
        "Describe your preferred learning style",
        "Include what you hope to achieve",
        "Add details about your availability for sessions"
      ]
    }
  };

  // Use category-specific suggestions if available, otherwise fall back to common
  const suggestions = categorySpecificSuggestions[skillCategory]?.[listingType] || commonSuggestions[listingType];
  let title = suggestions.titles[0];
  let description = suggestions.descriptions[0];

  // Customize based on skills and levels
  if (relevantSkills.length > 0 && primarySkill) {
    const randomTitleIndex = Math.floor(Math.random() * suggestions.titles.length);
    const randomDescIndex = Math.floor(Math.random() * suggestions.descriptions.length);

    title = suggestions.titles[randomTitleIndex].replace(/\{skill\}/g, primarySkill);
    description = suggestions.descriptions[randomDescIndex].replace(/\{skill\}/g, primarySkill);

    // Level-specific customizations for teaching
    if (listingType === 'teach') {
      const levelAdjectives = {
        beginner: ['Patient', 'Supportive', 'Encouraging'],
        intermediate: ['Experienced', 'Knowledgeable', 'Professional'],
        advanced: ['Expert', 'Senior', 'Master']
      };

      const levelDescriptions = {
        beginner: 'I understand the learning journey and focus on building strong fundamentals with patience and encouragement.',
        intermediate: 'I have solid experience and can guide you through practical applications and real-world scenarios.',
        advanced: 'I bring deep expertise and can help you master advanced concepts and industry best practices.'
      };

      // Add level-appropriate adjective to title if it doesn't already have one
      const adjective = levelAdjectives[primaryLevel][Math.floor(Math.random() * levelAdjectives[primaryLevel].length)];
      if (!title.includes('Expert') && !title.includes('Professional') && !title.includes('Senior')) {
        title = title.replace(primarySkill, `${primarySkill} (${adjective} Level)`);
      }

      // Enhance description with level-specific content
      if (!description.includes('experience') && !description.includes('expertise')) {
        description += ` ${levelDescriptions[primaryLevel]}`;
      }
    }

    // Level-specific customizations for learning
    if (listingType === 'learn') {
      const learnerDescriptions = {
        beginner: "I'm completely new to this but very eager to learn! I appreciate patient instruction and clear explanations.",
        intermediate: "I have some basic knowledge but want to deepen my understanding and fill knowledge gaps.",
        advanced: "I have solid fundamentals and want to master advanced techniques and best practices."
      };

      // Find the user's level for the skill they want to learn (if they have any experience)
      const learningLevel = 'beginner'; // Default for new learners
      description += ` ${learnerDescriptions[learningLevel]}`;
    }

    // Add estimated years for programming
    if (skillCategory === 'programming' && listingType === 'teach') {
      const experienceYears = {
        beginner: Math.floor(Math.random() * 2) + 1, // 1-2 years
        intermediate: Math.floor(Math.random() * 3) + 3, // 3-5 years  
        advanced: Math.floor(Math.random() * 5) + 5 // 5-9 years
      };
      description = description.replace(/\{years\}/g, experienceYears[primaryLevel].toString());
    }
  } else {
    title = listingType === 'teach' ? "Share Your Knowledge & Skills" : "Learn New Skills & Grow";
    description = listingType === 'teach' ?
      "I have valuable knowledge and experience to share. Let's connect and learn from each other!" :
      "I'm eager to learn new skills and grow. Looking for patient teachers and mentors to guide me.";
  }

  // Get appropriate notes based on category and type
  let notes = suggestions.notes || commonSuggestions[listingType].notes;

  // Add location-aware enhancements
  if (userLocation) {
    // Enhance description with location context
    const locationEnhancements = {
      teach: [
        `Available for both online and in-person sessions in ${userLocation}.`,
        `Based in ${userLocation} - happy to meet locally or teach online.`,
        `Located in ${userLocation} area, offering flexible session formats.`
      ],
      learn: [
        `Located in ${userLocation} and available for in-person or online learning.`,
        `Based in ${userLocation} - prefer local meetups but open to online sessions.`,
        `From ${userLocation} area, flexible with session location and timing.`
      ]
    };

    const enhancement = locationEnhancements[listingType][Math.floor(Math.random() * locationEnhancements[listingType].length)];
    description += ` ${enhancement}`;

    // Add location-specific notes
    const locationNotes = [
      `Consider mentioning your availability for in-person sessions in ${userLocation}`,
      "Include your preferred session format (online/in-person/hybrid)",
      "Mention any travel distance you're comfortable with",
      "Consider time zone preferences for online sessions"
    ];

    notes = [...notes, ...locationNotes.slice(0, 2)];
  }

  return {
    suggestions: {
      title,
      description,
      notes,
      category: skillCategory,
      primarySkill: primarySkill || 'General',
      level: primaryLevel,
      relevantSkillsCount: relevantSkills.length,
      location: userLocation
    }
  };
};

// 新增：基于用户技能生成AI建议
async function generateListingSuggestions(userSkills, listingType = 'teach', context = {}) {
  // If AI is not available, use fallback suggestions
  if (!modelsAvailable) {
    return getFallbackSuggestions(userSkills, listingType, context);
  }

  const teachSkills = (userSkills || []).filter(skill => skill.type === 'teach');
  const learnSkills = (userSkills || []).filter(skill => skill.type === 'learn');

  const relevantSkills = listingType === 'teach' ? teachSkills : learnSkills;
  const otherSkills = listingType === 'teach' ? learnSkills : teachSkills;

  // Use fallback for users with no skills
  if (relevantSkills.length === 0) {
    return getFallbackSuggestions(userSkills, listingType, context);
  }

  const primarySkillData = relevantSkills[0];
  const primarySkill = primarySkillData?.Skill?.name || primarySkillData?.skillName;
  const primaryLevel = primarySkillData?.level || 'intermediate';
  const userLocation = context.user?.location;

  const skillNames = relevantSkills.map(skill => skill.Skill?.name || skill.skillName).filter(Boolean);
  const otherSkillNames = otherSkills.map(skill => skill.Skill?.name || skill.skillName).filter(Boolean);

  // Create location-aware context
  let locationContext = '';
  if (userLocation) {
    locationContext = `\nUser location: ${userLocation}
    
Include location-relevant details when appropriate:
- For in-person sessions: mention willingness to meet locally or travel distance
- For online sessions: mention time zone considerations for ${userLocation}
- For local community: reference local learning/teaching opportunities
- Use location-appropriate language and cultural context`;
  }

  const prompt = `Generate a helpful listing suggestion for a user who wants to ${listingType} skills.

User's ${listingType} skills: ${skillNames.join(', ')} (Primary skill level: ${primaryLevel})
${otherSkillNames.length > 0 ? `User's ${listingType === 'teach' ? 'learn' : 'teach'} skills: ${otherSkillNames.join(', ')}` : ''}${locationContext}

Create suggestions that:
1. Highlight their expertise in ${primarySkill} (${primaryLevel} level)
2. Make the listing attractive and professional
3. Include specific details about what they can offer/want
4. Match their skill level appropriately (${primaryLevel})
5. Use friendly, approachable language
${userLocation ? '6. Include location-relevant details when appropriate' : ''}

For ${primaryLevel} level ${listingType === 'teach' ? 'teachers' : 'learners'}:
${listingType === 'teach' ?
      primaryLevel === 'beginner' ? '- Focus on patience, understanding, and building fundamentals' :
        primaryLevel === 'intermediate' ? '- Emphasize practical experience and real-world applications' :
          '- Highlight deep expertise, advanced techniques, and industry best practices'
      :
      primaryLevel === 'beginner' ? '- Show enthusiasm and commitment to learning' :
        primaryLevel === 'intermediate' ? '- Mention existing knowledge and desire to advance' :
          '- Focus on mastering advanced concepts and techniques'
    }

Keep title under 80 characters and description under 500 characters.

Return ONLY JSON in the required schema.`;

  try {
    const raw = await runModel(suggestModel, prompt);
    console.log('AI Response received, length:', raw.length);

    const result = safeJsonParse(raw, {
      suggestions: {
        title: `${listingType === 'teach' ? 'Teaching' : 'Learning'} ${primarySkill}`,
        description: `I'm ${listingType === 'teach' ? 'offering to teach' : 'looking to learn'} ${skillNames.slice(0, 2).join(' and ')}. ${listingType === 'teach' ? 'I have experience and can help you get started.' : 'I\'m eager to learn and practice with others.'}`,
        notes: [
          "Be specific about what you're offering or seeking",
          "Mention your experience level or current knowledge",
          "Include what students can expect to learn or achieve",
          "Add details about your teaching style or learning preferences"
        ]
      }
    });

    return {
      suggestions: {
        title: result.suggestions?.title || `${listingType === 'teach' ? 'Teaching' : 'Learning'} ${primarySkill}`,
        description: result.suggestions?.description || `I'm ${listingType === 'teach' ? 'offering to teach' : 'looking to learn'} ${skillNames.slice(0, 2).join(' and ')}. ${listingType === 'teach' ? 'I have experience and can help you get started.' : 'I\'m eager to learn and practice with others.'}`,
        notes: Array.isArray(result.suggestions?.notes) ? result.suggestions.notes : [
          "Be specific about what you're offering or seeking",
          "Mention your experience level or current knowledge",
          "Include what students can expect to learn or achieve",
          "Add details about your teaching style or learning preferences"
        ],
        level: primaryLevel,
        category: getSkillCategory(primarySkill),
        primarySkill: primarySkill,
        location: userLocation
      }
    };
  } catch (error) {
    console.error('AI suggestion generation failed, using fallback:', error);
    return getFallbackSuggestions(userSkills, listingType, context);
  }
}

// 新增：判定 + 修改建议 + 安全改写
async function checkContentWithSuggestions(payload) {
  const {
    title = "",
    description = "",
    maxTitle = 80,
    maxDescription = 800
  } = payload || {};

  const prompt = `You will analyze and improve a listing draft. Return ONLY JSON.

{MAX_TITLE}: ${maxTitle}
{MAX_DESC}: ${maxDescription}

Input:
Title:
"""${title.toString().slice(0, 500)}"""

Description:
"""${description.toString().slice(0, 7000)}"""`;

  const raw = await runModel(suggestModel, prompt);

  try {
    const result = safeJsonParse(raw, {
      suggestions: {
        title: "",
        description: "",
        notes: []
      }
    });

    return {
      suggestions: {
        title: result.suggestions?.title || "",
        description: result.suggestions?.description || "",
        notes: Array.isArray(result.suggestions?.notes) ? result.suggestions.notes : []
      }
    };
  } catch (error) {
    console.error('AI rewrite failed:', error);
    // 兜底：退回基础判定
    const base = await checkAdultAndToxicContent([title, description].join("\n"));
    return { ...base, suggestions: { title: "", description: "", notes: [] } };
  }
}

// Health check for Gemini AI service
async function checkGeminiHealth() {
  // If API key is missing, return offline status immediately
  if (!apiKey) {
    return {
      online: false,
      message: 'API key not configured'
    };
  }

  // If AI models are not available, return offline
  if (!modelsAvailable || !genAI) {
    return {
      online: false,
      message: 'Failed to initialize Gemini AI'
    };
  }

  try {
    // Perform a lightweight API call to check connectivity
    // Using countTokens is much cheaper than generating content
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    await model.countTokens('ping');

    return {
      online: true,
      message: 'Connected'
    };
  } catch (error) {
    console.error('Gemini health check failed:', error.message);
    return {
      online: false,
      message: error.message || 'Connection failed'
    };
  }
}

// Report evidence analysis using multimodal model
const fs = require('fs');
const path = require('path');

/**
 * Analyze report evidence (text + images) using Gemini Pro
 * @param {string} reportText - The report reason/description
 * @param {string[]} filePaths - Array of file paths for evidence images
 * @returns {Object} Analysis result with verdict, severity, confidence, and reasoning
 */
async function analyzeReportEvidence(reportText, filePaths = []) {
  // If AI not available, return uncertain verdict
  if (!modelsAvailable || !genAI) {
    return {
      success: false,
      verdict: 'uncertain',
      severity: 'none',
      confidence: 0,
      summary: 'AI analysis unavailable',
      reasoning: 'The AI moderation system is not configured.',
      category: 'unknown',
      recommendedPenalty: 'manual_review'
    };
  }

  try {
    // Use Gemini 2.0 Flash for multimodal analysis (verified working)
    const reportModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are a content moderation AI for a skill exchange platform. You are analyzing a report submitted by a "Reporter" against a "Target User". 

YOUR JOB: Determine if the **Target User** has violated any policies based on the Report Text and Evidence provided.

Output ONLY valid JSON. No fences. No prose.
Schema:
{
  "isViolation": boolean,
  "confidence": number (0.0 to 1.0),
  "verdict": "violation" | "harmless" | "uncertain",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "category": string,
  "summary": string (max 100 chars),
  "reasoning": string (max 300 chars),
  "recommendedPenalty": string
}

CRITICAL RULES FOR ANALYSIS:
1. **Focus on the Target User:** "isViolation" must be TRUE ONLY if the **Target User** committed a violation. 
2. **Retaliatory/Invalid Reports:** If the Reporter says "They reported me so I am reporting them", or "I hate them", or provides no evidence of the Target User's wrongdoing, this is a **FALSE/RETALIATORY REPORT**.
   - Verdict: "harmless"
   - Severity: "none"
   - Summary: "Retaliatory or baseless report"
   - Reasoning: "The report appears to be retaliatory or contains no evidence of violation by the target user."
3. **Evidence Mismatch:** If the uploaded evidence (images) does not support the claim, downgrade confidence or mark as uncertain.

Severity Guidelines (for Target User's actions):
- none: No violation by Target User (including invalid/retaliatory reports)
- low: Minor issues (spam, irrelevant content) -> Warning
- medium: Harassment, inappropriate language -> 3-day suspension
- high: Hate speech, scam attempts -> 7-day suspension
- critical: Threats, illegal content, child safety -> Permanent ban

Categories: spam, harassment, hate_speech, scam_attempt, threats, inappropriate_content, fake_profile, illegal_content, child_safety, other, false_report

Be thorough but fair. Consider context. If uncertain, set confidence < 0.7.`
    });

    // Build content parts
    const parts = [];

    // Add text prompt
    parts.push({
      text: `Analyze this user report.
      
      REPORT DETAILS:
      - Reporter's Claim: """${(reportText || '').slice(0, 5000)}"""
      
      TASK:
      Does the Report Text (and any evidence) prove that the TARGET USER violated a policy?
      If the Reporter is just venting, retaliating, or providing no actual details of valid misconduct, mark as "harmless" (severity: none).
      
${filePaths.length > 0 ? `Evidence files attached: ${filePaths.length} image(s)` : 'No evidence files attached.'}

Provide your analysis in the required JSON schema.`
    });

    // Add image parts if available
    for (const filePath of filePaths.slice(0, 5)) { // Max 5 images
      try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
          const fileData = fs.readFileSync(absolutePath);
          const base64Data = fileData.toString('base64');
          const mimeType = getMimeType(absolutePath);

          if (mimeType.startsWith('image/')) {
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data
              }
            });
          }
        }
      } catch (fileError) {
        console.warn(`Failed to read evidence file ${filePath}:`, fileError.message);
      }
    }

    // Generate analysis
    const result = await limiter.schedule(async () => {
      const response = await reportModel.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      });
      return response.response.text();
    });

    // Parse response
    let analysis;
    try {
      let jsonStr = result.trim();
      // Clean up common issues
      jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI report analysis:', parseError);
      return {
        success: false,
        verdict: 'uncertain',
        severity: 'none',
        confidence: 0,
        summary: 'AI analysis failed',
        reasoning: 'Failed to parse AI response. Manual review required.',
        category: 'unknown',
        recommendedPenalty: 'manual_review'
      };
    }

    // Normalize and validate response
    return {
      success: true,
      verdict: ['violation', 'harmless', 'uncertain'].includes(analysis.verdict) ? analysis.verdict : 'uncertain',
      severity: ['none', 'low', 'medium', 'high', 'critical'].includes(analysis.severity) ? analysis.severity : 'none',
      confidence: Math.min(1, Math.max(0, Number(analysis.confidence) || 0)),
      summary: String(analysis.summary || '').slice(0, 200),
      reasoning: String(analysis.reasoning || '').slice(0, 500),
      category: String(analysis.category || 'other').toLowerCase(),
      recommendedPenalty: String(analysis.recommendedPenalty || 'manual_review'),
      isViolation: Boolean(analysis.isViolation)
    };
  } catch (error) {
    console.error('Report analysis error:', error);
    return {
      success: false,
      verdict: 'uncertain',
      severity: 'none',
      confidence: 0,
      summary: 'Analysis error',
      reasoning: `Error during analysis: ${error.message}`,
      category: 'unknown',
      recommendedPenalty: 'manual_review'
    };
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
  checkAdultAndToxicContent,
  checkContentWithSuggestions,
  generateListingSuggestions,
  checkGeminiHealth,
  analyzeReportEvidence
};
