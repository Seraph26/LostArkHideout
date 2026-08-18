(() => {
  const run = () => {
    const data = window.LostArkHideoutClassData;
    if (!data) return;
    document.querySelectorAll('.party-member').forEach(member => {
      const meta = member.querySelector('.party-member-main span');
      if (!meta) return;
      const cls = (meta.textContent || '').split(' · ')[0].trim();
      const src = data.iconUrl(cls);
      const img = member.querySelector('img.class-icon');
      if (src && img && img.src !== src) img.src = src;
      if (src && !img) {
        const link = member.querySelector('.party-character-link');
        if (link) {
          const icon = document.createElement('img');
          icon.className = 'class-icon';
          icon.alt = '';
          icon.src = src;
          link.prepend(icon);
        }
      }
    });
  };
  const observer = new MutationObserver(run);
  observer.observe(document.body, {subtree:true, childList:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
})();
