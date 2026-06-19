(function () {
    document.querySelectorAll('.glass-card input').forEach(function (input) {
        input.addEventListener('focus', function () {
            var card = input.closest('.glass-card');
            if (card) card.style.boxShadow = '0 0 40px rgba(160, 120, 255, 0.15)';
        });
        input.addEventListener('blur', function () {
            var card = input.closest('.glass-card');
            if (card) card.style.boxShadow = '';
        });
    });

    var blobs = document.querySelectorAll('.auth-v2-aurora-blob, .auth-visual-blob');
    if (!blobs.length) return;

    window.addEventListener('mousemove', function (e) {
        var moveX = (e.clientX / window.innerWidth - 0.5) * 30;
        var moveY = (e.clientY / window.innerHeight - 0.5) * 30;
        blobs.forEach(function (blob, index) {
            var speed = (index + 1) * 0.5;
            blob.style.transform = 'translate(' + (moveX * speed) + 'px, ' + (moveY * speed) + 'px)';
        });
    });
})();
