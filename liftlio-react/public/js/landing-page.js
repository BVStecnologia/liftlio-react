/**
 * Liftlio Landing Page - JavaScript
 * Handles theme switching, language switching, and basic interactions
 */

// Translations object
// English-only translations (Portuguese support removed)
const translations = {
    nav: {
        features: "Features",
        pricing: "Pricing",
        testimonials: "Testimonials",
        login: "Sign In"
    },
    hero: {
        badge: "Organic Word-of-Mouth at Scale",
        title: "At Last, A Way to Scale Word-of-Mouth Recommendations",
        titleHighlight: "Without Paying for Ads",
        subtitle: "Liftlio utilizes AI to get your brand mentioned in genuine conversations across the web, allowing your product to be discovered organically at scale.",
        cta: {
            primary: "Start Growing Today",
            secondary: "See How It Works"
        },
        metrics: {
            mentions: "Mentions",
            positive: "Positive",
            leads: "Leads"
        }
    },
    features: {
        title: "Features That",
        titleHighlight: "Drive Results",
        subtitle: "Everything you need to monitor, analyze, and convert mentions into real opportunities"
    },
    stats: {
        monitored: "Mentions Monitored",
        leads: "Leads Generated",
        accuracy: "AI Accuracy",
        monitoring: "Monitoring"
    },
    process: {
        title: "How Liftlio",
        titleHighlight: "Works",
        subtitle: "Our intelligent 6-step process creates an organic traffic snowball that grows forever",
        steps: [
            {
                title: "Train It Once",
                description: "Liftlio learns about your product in seconds"
            },
            {
                title: "Video Analysis",
                description: "AI watches videos and identifies key topics, finding perfect moments to reference"
            },
            {
                title: "Lead Detection",
                description: "Identifies comments from potential customers asking questions or seeking solutions"
            },
            {
                title: "Value Creation",
                description: "Generates specific, contextualized comments that genuinely help other users"
            },
            {
                title: "Smart Diversification",
                description: "Varies interaction types to maintain authenticity and avoid repetitive patterns"
            },
            {
                title: "Compound Growth",
                description: "The more videos commented, the greater your brand's authority and visibility in the niche"
            }
        ]
    },
    pricing: {
        title: "Simple Pricing,",
        titleHighlight: "Powerful Results",
        subtitle: "Choose the perfect plan for your monitoring needs",
        monthly: "per month",
        cta: "Get Started Now"
    },
    cta: {
        title: "Trust wins.",
        titleHighlight: "Let AI",
        titleEnd: "earn it for you.",
        subtitle: "Every day, conversations happen where your ideal customers ask for recommendations. Tomorrow, more discussions will start. More questions will be asked. More buying decisions will be influenced by peer recommendations. The question is: will your brand be part of those conversations?",
        button: "→ Try Liftlio"
    }
};

// State management
const state = {
    theme: 'light',
    language: 'en', // English only
    scrolled: false,
    mobileMenuOpen: false
};

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', state.theme);
}

// Initialize language - English only
function initLanguage() {
    state.language = 'en';
    document.documentElement.setAttribute('data-lang', 'en');
    document.documentElement.lang = 'en-US';
    updateLanguageContent();
}

// Toggle theme
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    
    // Update theme button icon
    const themeButton = document.querySelector('.theme-toggle');
    if (themeButton) {
        themeButton.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
    }
}

// Toggle language - Removed (English only)
function toggleLanguage() {
    // Language toggle removed - site is now English only
    console.log('Language toggle disabled - English only');
}

// Update content based on language - English only
function updateLanguageContent() {
    const t = translations;
    
    // Update meta tags - English only
    document.title = 'Liftlio - Scale Word-of-Mouth Recommendations Without Paying for Ads';
    document.querySelector('meta[name="description"]').content = 
        'Liftlio utilizes AI to get your brand mentioned in genuine conversations across the web, allowing your product to be discovered organically at scale.';
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = t;
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return;
            }
        }
        
        if (typeof value === 'string') {
            element.textContent = value;
        }
    });
}

// Handle scroll events
function handleScroll() {
    const scrolled = window.scrollY > 50;
    if (scrolled !== state.scrolled) {
        state.scrolled = scrolled;
        const header = document.querySelector('.header');
        if (header) {
            header.classList.toggle('scrolled', scrolled);
        }
    }
}

// Toggle mobile menu
function toggleMobileMenu(open = !state.mobileMenuOpen) {
    state.mobileMenuOpen = open;
    const menu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    
    if (menu && overlay) {
        menu.classList.toggle('open', open);
        overlay.classList.toggle('open', open);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = open ? 'hidden' : '';
    }
}

// Smooth scroll to section
function scrollToSection(targetId) {
    const target = document.querySelector(targetId);
    if (target) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (state.mobileMenuOpen) {
            toggleMobileMenu(false);
        }
    }
}

// Initialize carousel
function initCarousel(carouselId) {
    const carousel = document.querySelector(carouselId);
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const indicators = carousel.querySelectorAll('.carousel-indicator');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    
    let currentSlide = 0;
    let autoplayInterval;
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
        
        currentSlide = index;
    }
    
    function nextSlide() {
        showSlide((currentSlide + 1) % slides.length);
    }
    
    function prevSlide() {
        showSlide((currentSlide - 1 + slides.length) % slides.length);
    }
    
    function startAutoplay() {
        autoplayInterval = setInterval(nextSlide, 4000);
    }
    
    function stopAutoplay() {
        clearInterval(autoplayInterval);
    }
    
    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', () => {
        prevSlide();
        stopAutoplay();
        startAutoplay();
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
        nextSlide();
        stopAutoplay();
        startAutoplay();
    });
    
    indicators.forEach((indicator, i) => {
        indicator.addEventListener('click', () => {
            showSlide(i);
            stopAutoplay();
            startAutoplay();
        });
    });
    
    // Start autoplay
    startAutoplay();
    
    // Pause on hover
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
}

// Form validation
function validateForm(formId) {
    const form = document.querySelector(formId);
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Basic validation
        let isValid = true;
        const errors = {};
        
        // Validate email
        if (data.email && !isValidEmail(data.email)) {
            errors.email = 'Invalid email';
            isValid = false;
        }
        
        // Validate URL
        if (data.url && !isValidURL(data.url)) {
            errors.url = 'Invalid URL';
            isValid = false;
        }
        
        if (isValid) {
            // Handle form submission
            console.log('Form submitted:', data);
            
            // Show success message
            const successMsg = 'Form submitted successfully!';
            alert(successMsg);
        } else {
            // Show errors
            Object.keys(errors).forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                    input.classList.add('error');
                    // You can add error message display here
                }
            });
        }
    });
}

// Utility functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme and language
    initTheme();
    initLanguage();
    
    // Set up event listeners
    window.addEventListener('scroll', handleScroll);
    
    // Theme toggle
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });
    
    // Language toggle
    document.querySelectorAll('.lang-toggle').forEach(btn => {
        btn.addEventListener('click', toggleLanguage);
    });
    
    // Mobile menu
    document.querySelectorAll('.mobile-menu-button').forEach(btn => {
        btn.addEventListener('click', () => toggleMobileMenu(true));
    });
    
    document.querySelectorAll('.mobile-menu-close, .mobile-menu-overlay').forEach(elem => {
        elem.addEventListener('click', () => toggleMobileMenu(false));
    });
    
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            scrollToSection(targetId);
        });
    });
    
    // Initialize carousels
    initCarousel('.testimonials-carousel');
    
    // Initialize forms
    validateForm('.interactive-proof-form');
    
    // Remove loading state
    document.body.classList.add('loaded');
});

// Export functions for external use
window.liftlio = {
    toggleTheme,
    toggleLanguage,
    toggleMobileMenu,
    scrollToSection
};