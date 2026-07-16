const toggle = document.querySelector(".nav__toggle, .menu-toggle");
const links = document.querySelector(".nav__links, .site-nav");

if (toggle && links) {
  toggle.addEventListener("click", () => {
    const isOpen = links.dataset.open === "true";
    links.dataset.open = String(!isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  links.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      links.dataset.open = "false";
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (event) => {
    if (!links.contains(event.target) && !toggle.contains(event.target)) {
      links.dataset.open = "false";
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll("[data-year], [data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
