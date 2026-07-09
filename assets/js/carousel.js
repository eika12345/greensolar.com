(function () {
    var viewport = document.querySelector('.testimonials-viewport');
    var track = document.querySelector('.testimonials-track');
    var dotsWrap = document.querySelector('.testimonials-dots');
    var btnLeft = document.querySelector('.testimonial-arrow-left');
    var btnRight = document.querySelector('.testimonial-arrow-right');

    if (!viewport || !track) return;

    var originalCards = Array.prototype.slice.call(track.children);

    // Clone the whole set of cards on both sides of the real ones, so that
    // scrolling past either edge reveals more cards (a repeat of the set)
    // instead of jumping back to the opposite end. Once the scroll settles
    // on a cloned page we silently re-align to the matching real page, so
    // the next click keeps going in the same direction forever.
    var leadCards = originalCards.map(function (c) {
        var clone = c.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        return clone;
    });
    var trailCards = originalCards.map(function (c) {
        var clone = c.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        return clone;
    });

    var frag = document.createDocumentFragment();
    leadCards.forEach(function (c) { frag.appendChild(c); });
    originalCards.forEach(function (c) { frag.appendChild(c); }); // moves the real nodes
    trailCards.forEach(function (c) { frag.appendChild(c); });
    track.appendChild(frag);

    // activeVirtual can drift below 0 or above pageCount()-1 while sitting on
    // a cloned page; it always gets folded back into range once idle.
    var activeVirtual = 0;
    var leadOffsets = [], originalOffsets = [], trailOffsets = [];
    var normalizeTimer, scrollTimer;

    function cardsPerView() {
    return 1;
}

    function pageCount() {
        return Math.ceil(originalCards.length / cardsPerView());
    }

    // Position of a card relative to the scrollable content, independent of
    // the viewport's current scroll position.
    function scrollOffsetOf(el) {
        var elRect = el.getBoundingClientRect();
        var vpRect = viewport.getBoundingClientRect();
        return elRect.left - vpRect.left + viewport.scrollLeft;
    }

    function blockOffsets(list) {
        var perView = cardsPerView();
        var offsets = [];
        for (var i = 0; i < list.length; i += perView) {
            offsets.push(scrollOffsetOf(list[i]));
        }
        return offsets;
    }

    function measure() {
        leadOffsets = blockOffsets(leadCards);
        originalOffsets = blockOffsets(originalCards);
        trailOffsets = blockOffsets(trailCards);
    }

    function offsetForVirtual(v) {
        var P = pageCount();
        if (v < 0) return leadOffsets[P + v];
        if (v >= P) return trailOffsets[v - P];
        return originalOffsets[v];
    }

    function logicalOf(v) {
        var P = pageCount();
        return ((v % P) + P) % P;
    }

    function buildDots() {
        dotsWrap.innerHTML = '';
        for (var i = 0; i < pageCount(); i++) {
            var dot = document.createElement('button');
            dot.className = 'testimonial-dot';
            dot.setAttribute('aria-label', 'Ir a la página ' + (i + 1));
            dot.addEventListener('click', function (idx) {
                return function () { goToLogicalPage(idx); };
            }(i));
            dotsWrap.appendChild(dot);
        }
    }

    function setDots(logicalPage) {
        var dots = dotsWrap.querySelectorAll('.testimonial-dot');
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === logicalPage);
        });
    }

    function goToLogicalPage(idx) {
        activeVirtual = idx;
        setDots(logicalOf(activeVirtual));
        viewport.scrollTo({ left: offsetForVirtual(activeVirtual), behavior: 'smooth' });
        scheduleNormalize();
    }

    function move(direction) {
        activeVirtual += direction;
        setDots(logicalOf(activeVirtual));
        viewport.scrollTo({ left: offsetForVirtual(activeVirtual), behavior: 'smooth' });
        scheduleNormalize();
    }

    function scheduleNormalize() {
        viewport.removeEventListener('scrollend', handleSettled);
        clearTimeout(normalizeTimer);
        if ('onscrollend' in window) {
            viewport.addEventListener('scrollend', handleSettled, { once: true });
        } else {
            normalizeTimer = setTimeout(handleSettled, 450);
        }
    }

    // Once the animation lands on a cloned page, jump instantly (no smooth
    // scroll) to the same-looking spot in the real set so it can keep going.
    function handleSettled() {
        var P = pageCount();
        if (activeVirtual < 0 || activeVirtual >= P) {
            var normalized = logicalOf(activeVirtual);
            activeVirtual = normalized;
            viewport.scrollLeft = originalOffsets[normalized];
        }
    }

    btnLeft.addEventListener('click', function () { move(-1); });
    btnRight.addEventListener('click', function () { move(1); });

    // Keep dots (and position) in sync if the user swipes/drags manually
    viewport.addEventListener('scroll', function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            var pos = viewport.scrollLeft;
            var P = pageCount();
            var best = 0, bestDist = Infinity;
            for (var v = -P; v < 2 * P; v++) {
                var off = offsetForVirtual(v);
                if (off === undefined) continue;
                var dist = Math.abs(off - pos);
                if (dist < bestDist) { bestDist = dist; best = v; }
            }
            activeVirtual = best;
            setDots(logicalOf(activeVirtual));
            handleSettled();
        }, 120);
    });

    window.addEventListener('resize', function () {
        measure();
        buildDots();
        activeVirtual = logicalOf(activeVirtual);
        viewport.scrollLeft = originalOffsets[activeVirtual];
        setDots(activeVirtual);
    });

    measure();
    buildDots();
    viewport.scrollLeft = originalOffsets[0];
    setDots(0);

    // Re-measure once images/fonts finish loading, in case card sizes shifted
    window.addEventListener('load', function () {
        measure();
        viewport.scrollLeft = originalOffsets[logicalOf(activeVirtual)];
    });
})();