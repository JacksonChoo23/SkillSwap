/**
 * Star Rating Utility Functions
 * Provides functions to render star ratings and calculate averages
 */

// Render star rating HTML
function renderStarRating(rating, options = {}) {
    const {
        maxStars = 5,
        size = 'md', // 'sm', 'md', 'lg'
        showValue = false,
        precision = 1 // 0 = whole stars, 1 = half stars, 2 = quarter stars
    } = options;

    const fullStars = Math.floor(rating);
    const decimal = rating - fullStars;
    let halfStar = false;

    if (precision >= 1 && decimal >= 0.25 && decimal < 0.75) {
        halfStar = true;
    }

    const emptyStars = maxStars - fullStars - (halfStar ? 1 : 0) - (decimal >= 0.75 ? 1 : 0);
    const extraFullStar = decimal >= 0.75 ? 1 : 0;

    let html = `<div class="star-rating star-rating-${size}" data-rating="${rating}">`;

    // Full stars
    for (let i = 0; i < fullStars + extraFullStar; i++) {
        html += '<i class="fas fa-star star filled"></i>';
    }

    // Half star
    if (halfStar) {
        html += '<i class="fas fa-star-half-alt star half-filled"></i>';
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star star"></i>';
    }

    html += '</div>';

    if (showValue) {
        html += `<span class="rating-value ms-2">${rating.toFixed(1)}</span>`;
    }

    return html;
}

// Calculate average rating from rating object
function calculateAverageRating(ratingObj) {
    const { communication, skill, attitude, punctuality } = ratingObj;
    return (communication + skill + attitude + punctuality) / 4;
}

// Calculate overall average from array of ratings
function calculateOverallAverage(ratings) {
    if (!ratings || ratings.length === 0) return 0;

    const total = ratings.reduce((acc, rating) => {
        return acc + calculateAverageRating(rating);
    }, 0);

    return total / ratings.length;
}

// Calculate category averages from array of ratings
function calculateCategoryAverages(ratings) {
    if (!ratings || ratings.length === 0) {
        return {
            communication: 0,
            skill: 0,
            attitude: 0,
            punctuality: 0
        };
    }

    const totals = ratings.reduce((acc, rating) => {
        acc.communication += rating.communication;
        acc.skill += rating.skill;
        acc.attitude += rating.attitude;
        acc.punctuality += rating.punctuality;
        return acc;
    }, { communication: 0, skill: 0, attitude: 0, punctuality: 0 });

    return {
        communication: totals.communication / ratings.length,
        skill: totals.skill / ratings.length,
        attitude: totals.attitude / ratings.length,
        punctuality: totals.punctuality / ratings.length
    };
}

// Render rating summary with bars
function renderRatingSummary(ratings) {
    if (!ratings || ratings.length === 0) {
        return '<div class="text-muted">No ratings yet</div>';
    }

    const overallAvg = calculateOverallAverage(ratings);
    const categoryAvgs = calculateCategoryAverages(ratings);

    let html = `
        <div class="rating-summary">
            <div class="row align-items-center mb-3">
                <div class="col-auto">
                    <div class="overall-rating">${overallAvg.toFixed(1)}</div>
                    ${renderStarRating(overallAvg, { size: 'lg' })}
                    <div class="text-muted mt-1">${ratings.length} review${ratings.length !== 1 ? 's' : ''}</div>
                </div>
                <div class="col">
                    ${renderRatingBar('Communication', categoryAvgs.communication)}
                    ${renderRatingBar('Skill Level', categoryAvgs.skill)}
                    ${renderRatingBar('Attitude', categoryAvgs.attitude)}
                    ${renderRatingBar('Punctuality', categoryAvgs.punctuality)}
                </div>
            </div>
        </div>
    `;

    return html;
}

// Render a single rating bar
function renderRatingBar(label, value) {
    const percentage = (value / 5) * 100;
    return `
        <div class="rating-bar-container">
            <span class="rating-bar-label">${label}</span>
            <div class="rating-bar-wrapper">
                <div class="rating-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="rating-bar-value">${value.toFixed(1)}</span>
        </div>
    `;
}

// Render individual review card
function renderReviewCard(rating, rater) {
    const avgRating = calculateAverageRating(rating);
    const formattedDate = new Date(rating.createdAt).toLocaleDateString();

    let html = `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    ${rater && rater.profileImage ?
            `<img src="${rater.profileImage}" alt="${rater.name}" class="reviewer-avatar">` :
            `<div class="reviewer-avatar bg-secondary text-white d-flex align-items-center justify-content-center">
                            <i class="fas fa-user"></i>
                        </div>`
        }
                    <div>
                        <div class="reviewer-name">${rater ? rater.name : 'Anonymous'}</div>
                        <div class="review-date">${formattedDate}</div>
                    </div>
                </div>
                ${renderStarRating(avgRating, { size: 'sm', showValue: true })}
            </div>
            
            <div class="review-rating-details">
                <div class="review-rating-item">
                    <span class="label">Communication:</span>
                    ${renderStarRating(rating.communication, { size: 'sm' })}
                </div>
                <div class="review-rating-item">
                    <span class="label">Skill Level:</span>
                    ${renderStarRating(rating.skill, { size: 'sm' })}
                </div>
                <div class="review-rating-item">
                    <span class="label">Attitude:</span>
                    ${renderStarRating(rating.attitude, { size: 'sm' })}
                </div>
                <div class="review-rating-item">
                    <span class="label">Punctuality:</span>
                    ${renderStarRating(rating.punctuality, { size: 'sm' })}
                </div>
            </div>
            
            ${rating.comment ? `<div class="review-comment">${rating.comment}</div>` : ''}
        </div>
    `;

    return html;
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.StarRating = {
        render: renderStarRating,
        calculateAverage: calculateAverageRating,
        calculateOverall: calculateOverallAverage,
        calculateCategories: calculateCategoryAverages,
        renderSummary: renderRatingSummary,
        renderBar: renderRatingBar,
        renderReview: renderReviewCard
    };
}
