import { isFirebaseConfigured, listPublishedProjects } from "./firebase.js";

const githubIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.56 21.79 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
`;

const externalIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
  </svg>
`;

const projectList = document.getElementById("project-list");
const projectStatus = document.getElementById("project-status");
const connectionBadge = document.getElementById("connection-badge");

function getProjectPrimaryUrl(project) {
  return project.live_url || project.github_url || "";
}

function renderProjectActions(project) {
  const links = [];

  if (project.github_url) {
    links.push(`
      <a href="${project.github_url}" target="_blank" rel="noreferrer" class="p-2 text-neutral-400 transition-colors hover:text-neutral-900" aria-label="${project.title} GitHub 링크">
        ${githubIcon}
      </a>
    `);
  }

  if (project.live_url) {
    links.push(`
      <a href="${project.live_url}" target="_blank" rel="noreferrer" class="p-2 text-neutral-400 transition-colors hover:text-neutral-900" aria-label="${project.title} 서비스 링크">
        ${externalIcon}
      </a>
    `);
  }

  return links.join("");
}

function renderProjectCard(project) {
  const tags = project.tags.map((tag) => `<span class="border border-neutral-200 px-2 py-1 text-xs text-neutral-400">${tag}</span>`).join("");
  const popupUrl = getProjectPrimaryUrl(project);
  const clickableClass = popupUrl
    ? "cursor-pointer transition-transform duration-300 hover:-translate-y-1"
    : "";
  const popupAttr = popupUrl ? `data-popup-url="${popupUrl}"` : "";

  return `
    <article class="group fade-in ${clickableClass}" ${popupAttr}>
      <div class="mb-6 rounded-[1.75rem] border border-neutral-200 bg-neutral-100 p-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]">
        <div class="aspect-video overflow-hidden rounded-[1.1rem] bg-[linear-gradient(135deg,#f5f5f5_0%,#e5e5e5_100%)] ring-1 ring-black/5">
          <img src="${project.image_url}" alt="${project.image_alt}" class="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0">
        </div>
      </div>
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="mb-2 flex items-center gap-3">
            <h3 class="text-lg font-medium text-neutral-900">${project.title}</h3>
            <span class="text-xs text-neutral-400">${project.year}</span>
          </div>
          <p class="mb-4 text-sm leading-relaxed text-neutral-500">${project.description}</p>
          <div class="flex flex-wrap gap-2">${tags}</div>
        </div>
        <div class="flex items-center gap-2">${renderProjectActions(project)}</div>
      </div>
    </article>
  `;
}

function observeFadeIns() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-in").forEach((element) => observer.observe(element));
}

function updateConnectionBadge(fallback) {
  if (fallback || !isFirebaseConfigured) {
    connectionBadge.textContent = "로컬 데모 데이터";
    return;
  }

  connectionBadge.textContent = "Firebase 연결됨";
}

function openProjectPopup(url) {
  if (!url) return;

  const width = 1440;
  const height = 900;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");

  window.open(url, "_blank", features);
}

async function renderProjects() {
  const { data, fallback, error } = await listPublishedProjects();
  updateConnectionBadge(fallback);

  if (error) {
    projectStatus.textContent = "Firebase 연결에 실패해 데모 프로젝트를 표시하고 있습니다.";
  } else if (fallback) {
    projectStatus.textContent = "Firebase 설정 전이므로 데모 프로젝트를 표시하고 있습니다.";
  } else {
    projectStatus.textContent = `공개 프로젝트 ${data.length}개를 불러왔습니다.`;
  }

  if (!data.length) {
    projectList.innerHTML = `
      <div class="rounded-3xl border border-dashed border-neutral-200 px-6 py-16 text-center text-sm text-neutral-400 md:col-span-2">
        아직 공개된 프로젝트가 없습니다. 관리자 페이지에서 프로젝트를 추가하세요.
      </div>
    `;
    return;
  }

  projectList.innerHTML = data.map(renderProjectCard).join("");
  observeFadeIns();
}

projectList.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;

  const card = event.target.closest("[data-popup-url]");
  if (!card) return;

  openProjectPopup(card.dataset.popupUrl || "");
});

renderProjects();
