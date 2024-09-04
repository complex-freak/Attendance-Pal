document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');

    // Set the sidebar to fixed when the page loads
    function makeSidebarStatic() {
        const sidebarTop = sidebar.offsetTop;

        window.addEventListener('scroll', function () {
            if (window.scrollY >= sidebarTop) {
                sidebar.style.position = 'fixed';
                sidebar.style.top = '0';
            } else {
                sidebar.style.position = 'relative';
                sidebar.style.top = 'auto';
            }
        });
    }

    // makeSidebarStatic();
});
