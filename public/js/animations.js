/**
 * Apple-Style Animation Effects for SkillSwap MY
 * High Performance 120fps Animation System with Debouncing
 */

// Performance optimization flags
const ANIMATION_CONFIG = {
    ENABLE_GPU_ACCELERATION: true,
    DEBOUNCE_DELAY: 100, // ms
    ANIMATION_FRAME_BUDGET: 16.67, // 60fps = 16.67ms per frame (120fps = 8.33ms)
    REDUCE_MOTION: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

// Debounce utility to prevent animation jank from rapid page transitions
function debounce(func, delay) {
    let timeoutId;
    let lastArgs;
    let lastThis;
    
    function wrapper(...args) {
        lastArgs = args;
        lastThis = this;
        
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            func.apply(lastThis, lastArgs);
            timeoutId = null;
        }, delay);
    }
    
    wrapper.cancel = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
    };
    
    return wrapper;
}

// RequestAnimationFrame throttle for smooth 120fps
function throttleRAF(func) {
    let rafId;
    let isScheduled = false;
    
    return function(...args) {
        if (!isScheduled) {
            isScheduled = true;
            rafId = requestAnimationFrame(() => {
                func.apply(this, args);
                isScheduled = false;
            });
        }
    };
}

// Initialize animations on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!ANIMATION_CONFIG.REDUCE_MOTION) {
        initializeAnimations();
        initializeScrollAnimations();
    }
});

// Core Animation Functions
function initializeAnimations() {
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Animate form inputs on focus with throttled RAF
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    const handleFormFocus = throttleRAF(function(e) {
        const input = e.target;
        if (input) {
            input.style.transform = 'scale(1.01)';
        }
    });
    
    const handleFormBlur = throttleRAF(function(e) {
        const input = e.target;
        if (input) {
            input.style.transform = 'scale(1)';
        }
    });

    formInputs.forEach(input => {
        input.addEventListener('focus', handleFormFocus);
        input.addEventListener('blur', handleFormBlur);
    });

    // Button ripple effect - optimized for 120fps
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            createRippleEffect(this, e);
        });
    });

    // Hover effect for cards - optimized
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.willChange = 'transform, box-shadow';
        });

        card.addEventListener('mouseleave', function() {
            this.style.willChange = 'auto';
        });
    });

    // Fade in alerts with debounced timing
    const alerts = document.querySelectorAll('.alert');
    const debouncedAlertAnimation = debounce(() => {
        alerts.forEach((alert, index) => {
            // Reduced stagger delay for 120fps
            alert.style.animation = `slideInDown 0.3s ease-out ${index * 0.03}s both`;
        });
    }, ANIMATION_CONFIG.DEBOUNCE_DELAY);
    
    debouncedAlertAnimation();
}

// Optimized ripple effect for 120fps
function createRippleEffect(button, event) {
    // Cancel any existing ripple
    const existingRipple = button.querySelector('.ripple-effect');
    if (existingRipple) {
        existingRipple.remove();
    }
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.position = 'absolute';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.borderRadius = '50%';
    ripple.style.pointerEvents = 'none';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    ripple.style.animation = 'rippleAnimation 0.3s ease-out forwards';
    ripple.style.willChange = 'transform, opacity';
    ripple.style.transform = 'translateZ(0)';

    button.appendChild(ripple);

    // Remove ripple after animation completes (optimized timing)
    setTimeout(() => ripple.remove(), 300);
}

function initializeScrollAnimations() {
    // Intersection Observer for scroll animations - optimized
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        // Batch DOM updates for better performance
        requestAnimationFrame(() => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-on-scroll');
                    observer.unobserve(entry.target);
                }
            });
        });
    }, observerOptions);

    // Observe all animate-on-scroll elements
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });

    // Also observe cards and tables
    document.querySelectorAll('.card, table tr').forEach(el => {
        if (el.offsetParent === null) return; // Skip hidden elements
        observer.observe(el);
    });
}

// Stagger animations for elements
function staggerElements(selector, delay = 50) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
        el.style.animationDelay = (index * delay) + 'ms';
    });
}

// Add glow effect on hover - optimized with throttle
function addGlowEffect(selector) {
    document.querySelectorAll(selector).forEach(el => {
        const handleMouseEnter = throttleRAF(() => {
            el.classList.add('glow');
        });
        
        const handleMouseLeave = throttleRAF(() => {
            el.classList.remove('glow');
        });
        
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
    });
}

// Pulse animation trigger - optimized
function triggerPulse(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }

    if (element) {
        element.style.animation = 'pulse 1.5s ease-in-out infinite';
        element.style.willChange = 'opacity';
    }
}

// Scale animation on click - optimized for 120fps
function addClickScaleAnimation(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('click', function() {
            this.style.animation = 'scaleUp 0.2s ease-out';
            this.style.willChange = 'transform, opacity';
            this.style.transform = 'translateZ(0)';
            
            const timer = setTimeout(() => {
                this.style.animation = '';
                this.style.willChange = 'auto';
            }, 200);
        });
    });
}

// Smooth page transition - optimized for 120fps
function smoothPageTransition() {
    const body = document.body;
    body.style.animation = 'fadeIn 0.3s ease-out';
    body.style.willChange = 'opacity';
    body.style.transform = 'translateZ(0)';
    
    // Clean up after animation
    setTimeout(() => {
        body.style.willChange = 'auto';
    }, 300);
}

// Initialize animations for dynamic content
function reinitializeAnimations() {
    // Clean up existing event listeners to prevent memory leaks
    document.removeEventListener('DOMContentLoaded', initializeAnimations);
    
    initializeAnimations();
    initializeScrollAnimations();
}

// Export for use in other scripts
window.AnimationUtils = {
    staggerElements,
    addGlowEffect,
    triggerPulse,
    addClickScaleAnimation,
    smoothPageTransition,
    reinitializeAnimations,
    createRippleEffect
};

// Initialize on load
smoothPageTransition();
