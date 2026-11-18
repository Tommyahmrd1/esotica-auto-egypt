(() => {
  const track = document.querySelector('#work-photos');
  const controls = document.querySelector('.work-gallery-controls');
  if (!track || !controls) return;
  const cards = [...track.querySelectorAll('.work-photo-card')];
  const left = controls.querySelector('[data-gallery-left]');
  const right = controls.querySelector('[data-gallery-right]');
  if (!cards.length || !left || !right) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => motion.matches ? 'instant' : 'smooth';

  function updateControls() {
    const bounds = track.getBoundingClientRect();
    const first = cards[0].getBoundingClientRect();
    const last = cards.at(-1).getBoundingClientRect();
    // Physical edges work in Arabic and English without RTL scrollLeft assumptions.
    left.disabled = Math.min(first.left, last.left) >= bounds.left - 2;
    right.disabled = Math.max(first.right, last.right) <= bounds.right + 2;
  }
  function move(direction) {
    track.scrollBy({left: direction * track.clientWidth * .82, behavior: behavior()});
  }
  left.addEventListener('click', () => move(-1));
  right.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') move(-1);
    else if (event.key === 'ArrowRight') move(1);
    else (event.key === 'Home' ? cards[0] : cards.at(-1))
      .scrollIntoView({block: 'nearest', inline: 'start', behavior: behavior()});
  });

  let frame = 0;
  track.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {frame = 0; updateControls();});
  }, {passive: true});
  if (typeof ResizeObserver === 'function') new ResizeObserver(updateControls).observe(track);
  else window.addEventListener('resize', updateControls);

  // Touch keeps native scrolling; a mouse drag must not open a photo accidentally.
  track.addEventListener('dragstart', event => event.preventDefault());
  let drag = null;
  let ignoreClick = false;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    ignoreClick = false;
    drag = {id: event.pointerId, start: event.clientX, last: event.clientX, moved: false};
  });
  track.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {finishDrag(event); return;}
    if (!drag.moved && Math.abs(event.clientX - drag.start) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      ignoreClick = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    track.scrollBy({left: drag.last - event.clientX, behavior: 'instant'});
    drag.last = event.clientX;
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    drag = null;
    track.classList.remove('is-dragging');
    updateControls();
  }
  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('click', event => {
    if (!ignoreClick) return;
    event.preventDefault();
    event.stopPropagation();
    ignoreClick = false;
  }, true);
  controls.hidden = false;
  updateControls();
})();
