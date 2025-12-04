/**
 * Shared JavaScript for Listing Create/Edit Forms
 * Expects window.listingData to be defined with:
 * - teachSkillsData: Object mapping ID to name
 * - learnSkillsData: Object mapping ID to name
 * - serverSuggestions: Object or null
 */

// Global variables from window.listingData
const { teachSkillsData, learnSkillsData, serverSuggestions } = window.listingData || {
    teachSkillsData: {},
    learnSkillsData: {},
    serverSuggestions: null
};

function updatePreview() {
    const title = document.querySelector('input[name="title"]').value.trim();
    const description = document.querySelector('textarea[name="description"]').value.trim();
    const skillId = document.querySelector('select[name="skill_id"]').value;
    const learnSkillId = document.querySelector('select[name="learn_skill_id"]').value;
    const visibility = document.querySelector('select[name="visibility"]').value;

    // Update preview elements
    const titleText = title || 'Your Listing Title';
    const descText = description || 'Your description will appear here...';

    document.getElementById('previewTitle').textContent = titleText;
    document.getElementById('previewDescription').textContent = descText;
    document.getElementById('mobilePreviewTitle').textContent = titleText;
    document.getElementById('mobilePreviewDescription').textContent = descText.length > 100 ? descText.substring(0, 100) + '...' : descText;

    document.getElementById('previewSkill').textContent = teachSkillsData[skillId] || 'Skill';
    document.getElementById('mobilePreviewSkill').textContent = teachSkillsData[skillId] || 'Skill';

    const learnBadge = document.getElementById('previewLearnSkill');
    const mobileLearnBadge = document.getElementById('mobilePreviewLearnSkill');

    if (learnSkillId && learnSkillsData[learnSkillId]) {
        const text = 'Wants: ' + learnSkillsData[learnSkillId];
        learnBadge.textContent = text;
        learnBadge.classList.remove('d-none');
        mobileLearnBadge.textContent = text;
        mobileLearnBadge.classList.remove('d-none');
    } else {
        learnBadge.classList.add('d-none');
        mobileLearnBadge.classList.add('d-none');
    }

    // Update visibility badge
    const visibilityBadge = document.getElementById('previewVisibility');
    visibilityBadge.textContent = visibility.charAt(0).toUpperCase() + visibility.slice(1);
    visibilityBadge.className = visibility === 'public' ? 'badge bg-success' : 'badge bg-warning';

    // Update card styling based on completeness
    const previewCard = document.getElementById('listingPreview');
    if (title && description && skillId) {
        previewCard.classList.remove('border-warning');
        previewCard.classList.add('border-success');
    } else {
        previewCard.classList.remove('border-success');
        // previewCard.classList.add('border-warning'); // Optional: don't show warning border to keep it clean
    }

    // Update AI button visibility
    checkSkillSelection();
}

function submitForm() {
    document.querySelector('form').submit();
}

// Auto-update preview when form fields change
document.addEventListener('DOMContentLoaded', function () {
    const fields = ['input[name="title"]', 'textarea[name="description"]', 'select[name="skill_id"]', 'select[name="learn_skill_id"]', 'select[name="visibility"]'];

    fields.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('input', updatePreview);
            element.addEventListener('change', updatePreview);
        }
    });

    // Initial preview update
    updatePreview();

    // Emphasis toggle init
    const toggle = document.getElementById('emphasisToggle');
    if (toggle) {
        const saved = localStorage.getItem('emphasis_learn_first');
        const learnFirst = saved === '1';
        toggle.checked = learnFirst;
        applyEmphasis(learnFirst);
        toggle.addEventListener('change', (e) => {
            const isLearnFirst = e.target.checked;
            localStorage.setItem('emphasis_learn_first', isLearnFirst ? '1' : '0');
            applyEmphasis(isLearnFirst);
            updatePreview();
        });
    }

    // Add event listeners for saved suggestions
    document.getElementById('saveSuggestion')?.addEventListener('click', saveSuggestion);
    document.getElementById('loadSavedSuggestions')?.addEventListener('click', showSavedSuggestions);

    // Render server-side suggestions if available
    if (serverSuggestions) {
        renderSuggestions(serverSuggestions);
    }

    // Initial check for skill selection
    checkSkillSelection();

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
});

// Apply AI suggestion to form fields
function applySuggestion(type, button) {
    const text = button.previousElementSibling.textContent.trim();
    if (type === 'title') {
        const titleInput = document.querySelector('input[name="title"]');
        if (titleInput) {
            titleInput.value = text;
            titleInput.focus();
            updatePreview();
        }
    } else if (type === 'description') {
        const descTextarea = document.querySelector('textarea[name="description"]');
        if (descTextarea) {
            descTextarea.value = text;
            descTextarea.focus();
            updatePreview();
        }
    }

    // Show feedback
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check text-success me-1"></i>Applied!';
    button.classList.remove('btn-outline-success');
    button.classList.add('btn-success');

    setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-success');
    }, 2000);
}

// Regenerate AI suggestions
document.getElementById('regenerateSuggestions')?.addEventListener('click', async function () {
    await regenerateSuggestions();
});

// Handle suggestion type change
function checkSkillSelection() {
    const teachSkillId = document.querySelector('select[name="skill_id"]').value;
    const learnSkillId = document.querySelector('select[name="learn_skill_id"]').value;

    const teachBtn = document.getElementById('generateTeachSuggestions');
    const learnBtn = document.getElementById('generateLearnSuggestions');

    if (teachSkillId) {
        teachBtn.disabled = false;
        teachBtn.classList.remove('text-muted');
        teachBtn.classList.add('text-primary');
        // Update tooltip
        const tooltip = bootstrap.Tooltip.getInstance(teachBtn);
        if (tooltip) tooltip.disable();
    } else {
        teachBtn.disabled = true;
        teachBtn.classList.add('text-muted');
        teachBtn.classList.remove('text-primary');
        const tooltip = bootstrap.Tooltip.getInstance(teachBtn);
        if (tooltip) tooltip.enable();
    }

    if (learnSkillId) {
        learnBtn.disabled = false;
        learnBtn.classList.remove('text-muted');
        learnBtn.classList.add('text-primary');
        const tooltip = bootstrap.Tooltip.getInstance(learnBtn);
        if (tooltip) tooltip.disable();
    } else {
        learnBtn.disabled = true;
        learnBtn.classList.add('text-muted');
        learnBtn.classList.remove('text-primary');
        const tooltip = bootstrap.Tooltip.getInstance(learnBtn);
        if (tooltip) tooltip.enable();
    }
}

// Global state for current suggestion type
let currentSuggestionType = 'teach';

async function triggerAiSuggestions(type) {
    currentSuggestionType = type;
    await regenerateSuggestions();
}

function renderSuggestions(data) {
    const card = document.getElementById('aiSuggestionsCard');
    const content = document.getElementById('suggestionsContent');

    card.classList.remove('d-none');

    let html = '';

    if (data.title) {
        html += `
  <div class="mb-3">
    <label class="fw-semibold text-primary small text-uppercase">Suggested Title</label>
    <p class="mb-2 bg-light p-3 rounded border">${data.title}</p>
    <button type="button" class="btn btn-sm btn-outline-success" onclick="applySuggestion('title', this)">
      <i class="fas fa-check me-1"></i>Use Title
    </button>
  </div>
`;
    }

    if (data.description) {
        html += `
  <div class="mb-3">
    <label class="fw-semibold text-primary small text-uppercase">Suggested Description</label>
    <p class="mb-2 bg-light p-3 rounded border">${data.description}</p>
    <button type="button" class="btn btn-sm btn-outline-success" onclick="applySuggestion('description', this)">
      <i class="fas fa-check me-1"></i>Use Description
    </button>
  </div>
`;
    }

    if (data.notes && data.notes.length) {
        html += `
  <div class="mb-0 mt-3 p-3 bg-info-subtle rounded">
    <label class="fw-bold text-info-emphasis small"><i class="fas fa-lightbulb me-1"></i>AI Tips</label>
    <ul class="small mb-0 mt-1 ps-3 text-info-emphasis">
      ${data.notes.map(note => `<li class="mb-1">${note}</li>`).join('')}
    </ul>
  </div>
`;
    }

    content.innerHTML = html;

    // Scroll to suggestions
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function regenerateSuggestions() {
    const type = currentSuggestionType;
    const card = document.getElementById('aiSuggestionsCard');
    const content = document.getElementById('suggestionsContent');
    const teachSkillId = document.querySelector('select[name="skill_id"]').value;
    const learnSkillId = document.querySelector('select[name="learn_skill_id"]').value;

    // Determine which button triggered this to show loading state
    const btnId = type === 'teach' ? 'generateTeachSuggestions' : 'generateLearnSuggestions';
    const button = document.getElementById(btnId) || document.getElementById('regenerateSuggestions');
    const originalHTML = button.innerHTML;

    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;

    // Show card if hidden
    card.classList.remove('d-none');
    content.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i><p class="text-muted">Asking AI for creative ideas...</p></div>';

    try {
        // Add cache busting and no-cache headers for fresh suggestions
        const timestamp = Date.now();
        let url = `/listings/ai-suggestions?type=${type}&nocache=${timestamp}`;
        if (teachSkillId) url += `&teach_skill_id=${teachSkillId}`;
        if (learnSkillId) url += `&learn_skill_id=${learnSkillId}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        const data = await response.json();

        if (data.suggestions) {
            renderSuggestions(data.suggestions);
        }
    } catch (error) {
        console.error('Failed to regenerate suggestions:', error);
        alert('Failed to generate new suggestions. Please try again.');
    } finally {
        // Restore button state
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

// Saved suggestions functionality
async function saveSuggestion() {
    try {
        // Get current AI suggestions
        const titleElement = document.querySelector('#suggestionsContent p'); // First p is title
        const descElement = document.querySelectorAll('#suggestionsContent p')[1]; // Second p is desc
        // Note: Selector depends on renderSuggestions structure. 
        // renderSuggestions uses: p.mb-2.bg-light...

        if (!titleElement || !descElement) {
            alert('No AI suggestions to save. Generate suggestions first.');
            return;
        }

        const title = titleElement.textContent.trim();
        const description = descElement.textContent.trim();
        const notesElements = document.querySelectorAll('#suggestionsContent li');
        const notes = Array.from(notesElements).map(li => li.textContent.trim());
        const suggestionType = currentSuggestionType; // Use global state
        const skillId = document.querySelector('select[name="skill_id"]').value;
        const skillCategory = teachSkillsData[skillId] || '';

        const response = await fetch('/listings/save-suggestion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                title,
                description,
                suggestion_type: suggestionType,
                skill_category: skillCategory,
                notes
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success feedback
            const button = document.getElementById('saveSuggestion');
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check text-success"></i>';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-success');

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-success');
            }, 2000);
        } else {
            alert('Failed to save suggestion: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Save suggestion error:', error);
        alert('Failed to save suggestion. Please try again.');
    }
}

function showSavedSuggestions() {
    const modal = new bootstrap.Modal(document.getElementById('savedSuggestionsModal'));
    modal.show();
    loadSuggestions('all');
}

async function loadSuggestions(type) {
    try {
        const listContainer = document.getElementById('savedSuggestionsList');
        listContainer.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        let url = '/listings/saved-suggestions';
        const params = new URLSearchParams();

        if (type === 'favorites') {
            params.append('favorites_only', 'true');
        } else if (type === 'teach' || type === 'learn') {
            params.append('type', type);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.suggestions && data.suggestions.length > 0) {
            listContainer.innerHTML = data.suggestions.map(suggestion => `
<div class="card border-0 shadow-sm mb-3" data-suggestion-id="${suggestion.id}">
<div class="card-body">
  <div class="d-flex justify-content-between align-items-start mb-2">
    <h6 class="card-title fw-bold mb-1 text-primary">${suggestion.title}</h6>
    <div class="d-flex gap-1">
      <button class="btn btn-sm ${suggestion.is_favorite ? 'btn-warning' : 'btn-outline-warning'} rounded-circle" 
              onclick="toggleFavorite(${suggestion.id}, this)">
        <i class="fas fa-star"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger rounded-circle" onclick="deleteSuggestion(${suggestion.id}, this)">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>
  <p class="card-text small text-muted mb-3">${suggestion.description}</p>
  <div class="d-flex justify-content-between align-items-center">
    <div>
      <span class="badge bg-${suggestion.suggestion_type === 'teach' ? 'primary' : 'info'} rounded-pill">${suggestion.suggestion_type}</span>
      ${suggestion.skill_category ? `<span class="badge bg-secondary rounded-pill">${suggestion.skill_category}</span>` : ''}
    </div>
    <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="applySavedSuggestion('${suggestion.title}', '${suggestion.description}')">
      <i class="fas fa-plus me-1"></i>Use
    </button>
  </div>
</div>
</div>
`).join('');
        } else {
            listContainer.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2"></i><p>No saved suggestions found.</p></div>';
        }

        // Update active filter button
        document.querySelectorAll('#savedSuggestionsModal .btn-outline-primary, #savedSuggestionsModal .btn-outline-warning').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

    } catch (error) {
        console.error('Load suggestions error:', error);
        document.getElementById('savedSuggestionsList').innerHTML = '<div class="text-center text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><p>Failed to load suggestions.</p></div>';
    }
}

async function toggleFavorite(id, button) {
    try {
        const response = await fetch(`/listings/saved-suggestions/${id}/favorite`, {
            method: 'PATCH',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (data.success) {
            if (data.is_favorite) {
                button.classList.remove('btn-outline-warning');
                button.classList.add('btn-warning');
            } else {
                button.classList.remove('btn-warning');
                button.classList.add('btn-outline-warning');
            }
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
    }
}

async function deleteSuggestion(id, button) {
    if (!confirm('Are you sure you want to delete this suggestion?')) {
        return;
    }

    try {
        const response = await fetch(`/listings/saved-suggestions/${id}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (data.success) {
            const card = button.closest('.card');
            card.remove();
        }
    } catch (error) {
        console.error('Delete suggestion error:', error);
        alert('Failed to delete suggestion.');
    }
}

function applySavedSuggestion(title, description) {
    // Apply to form fields
    document.querySelector('input[name="title"]').value = title;
    document.querySelector('textarea[name="description"]').value = description;

    // Update preview
    updatePreview();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('savedSuggestionsModal'));
    modal.hide();

    // Show feedback
    const titleInput = document.querySelector('input[name="title"]');
    titleInput.focus();
    titleInput.classList.add('is-valid');
    setTimeout(() => {
        titleInput.classList.remove('is-valid');
    }, 2000);
}

// Emphasis toggle behavior: reorder sections and adjust preview badge order
function applyEmphasis(isLearnFirst) {
    const teachSection = document.getElementById('teachSection');
    const learnSection = document.getElementById('learnSection');
    const teachLabel = document.getElementById('teachLabel');
    const learnLabel = document.getElementById('learnLabel');

    if (isLearnFirst) {
        // On md+ screens, show learn first
        teachSection.classList.remove('order-md-1');
        teachSection.classList.add('order-md-2');
        learnSection.classList.remove('order-md-2');
        learnSection.classList.add('order-md-1');
        if (teachLabel) teachLabel.textContent = 'I can teach';
        if (learnLabel) learnLabel.textContent = "I'm seeking to learn";
    } else {
        teachSection.classList.remove('order-md-2');
        teachSection.classList.add('order-md-1');
        learnSection.classList.remove('order-md-1');
        learnSection.classList.add('order-md-2');
        if (teachLabel) teachLabel.textContent = 'I will teach';
        if (learnLabel) learnLabel.textContent = 'I want to learn';
    }

    // Reorder preview badges
    const badgeTeach = document.getElementById('badgeTeachingLabel');
    const badgeTeachSkill = document.getElementById('previewSkill');
    const badgeLearn = document.getElementById('previewLearnSkill');
    if (badgeTeach && badgeTeachSkill && badgeLearn) {
        [badgeTeach, badgeTeachSkill, badgeLearn].forEach(el => {
            el.classList.remove('order-1', 'order-2', 'order-3');
        });
        if (isLearnFirst) {
            badgeLearn.classList.add('order-1');
            badgeTeach.classList.add('order-2');
            badgeTeachSkill.classList.add('order-3');
        } else {
            badgeTeach.classList.add('order-1');
            badgeTeachSkill.classList.add('order-2');
            badgeLearn.classList.add('order-3');
        }
    }
}
