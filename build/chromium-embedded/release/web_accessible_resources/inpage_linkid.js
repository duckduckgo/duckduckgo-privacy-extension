(() => {
    const gaqObj = {
        push: () => {}
    };
    window._gaq = (window._gaq === undefined) ? gaqObj : window._gaq;
})();
