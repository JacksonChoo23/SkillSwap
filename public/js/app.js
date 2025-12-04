// SkillSwap MY - Main JavaScript File

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Auto-hide alerts after 5 seconds
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Form validation
    setupFormValidation();

    // Dynamic skill management
    setupSkillManagement();

    // Availability management
    setupAvailabilityManagement();

    // Rating system
    setupRatingSystem();

    // WhatsApp integration
    setupWhatsAppIntegration();
});

// Form validation
function setupFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// Skill management
function setupSkillManagement() {
    // Add skill form
    const addSkillForm = document.getElementById('addSkillForm');
    if (addSkillForm) {
        addSkillForm.addEventListener('submit', function(e) {
            const skillSelect = document.getElementById('skillId');
            const typeSelect = document.getElementById('skillType');
            const levelSelect = document.getElementById('skillLevel');
            
            if (!skillSelect.value || !typeSelect.value || !levelSelect.value) {
                e.preventDefault();
                alert('Please fill in all skill fields.');
            }
        });
    }

    // Remove skill buttons
    const removeSkillButtons = document.querySelectorAll('.remove-skill');
    removeSkillButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to remove this skill?')) {
                e.preventDefault();
            }
        });
    });
}

// Availability management
function setupAvailabilityManagement() {
    // Add availability form
    const addAvailabilityForm = document.getElementById('addAvailabilityForm');
    if (addAvailabilityForm) {
        addAvailabilityForm.addEventListener('submit', function(e) {
            const daySelect = document.getElementById('dayOfWeek');
            const startTime = document.getElementById('startTime');
            const endTime = document.getElementById('endTime');
            
            if (!daySelect.value || !startTime.value || !endTime.value) {
                e.preventDefault();
                alert('Please fill in all availability fields.');
                return;
            }
            
            if (startTime.value >= endTime.value) {
                e.preventDefault();
                alert('End time must be after start time.');
            }
        });
    }

    // Remove availability buttons
    const removeAvailabilityButtons = document.querySelectorAll('.remove-availability');
    removeAvailabilityButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to remove this availability slot?')) {
                e.preventDefault();
            }
        });
    });
}

// Rating system
function setupRatingSystem() {
    const ratingForms = document.querySelectorAll('.rating-form');
    
    ratingForms.forEach(form => {
        const stars = form.querySelectorAll('.rating-star');
        const hiddenInput = form.querySelector('input[name="rating"]');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                const rating = index + 1;
                hiddenInput.value = rating;
                
                // Update star display
                stars.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.add('text-warning');
                        s.classList.remove('text-muted');
                    } else {
                        s.classList.remove('text-warning');
                        s.classList.add('text-muted');
                    }
                });
            });
        });
    });
}

// WhatsApp integration
function setupWhatsAppIntegration() {
    const whatsappButtons = document.querySelectorAll('.btn-whatsapp');
    
    whatsappButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const phone = this.dataset.phone;
            const message = this.dataset.message || 'Hello! I saw your skill listing on SkillSwap MY.';
            
            if (phone) {
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        });
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
}

function getMatchScoreClass(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
}

// AJAX helper functions
function makeRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return fetch(url, finalOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

// Show loading spinner
function showLoading(element) {
    element.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
    element.disabled = true;
}

// Hide loading spinner
function hideLoading(element, originalText) {
    element.innerHTML = originalText;
    element.disabled = false;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
}

// Export functions for use in other scripts
window.SkillSwap = {
    formatDate,
    formatTime,
    getDayName,
    getMatchScoreClass,
    makeRequest,
    showLoading,
    hideLoading,
    showToast
}; 