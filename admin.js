import {
  changeCurrentUserPassword,
  getDefaultProjects,
  getCurrentUser,
  isAdminUser,
  isFirebaseConfigured,
  listAllProjects,
  onAuthChange,
  removeProject,
  signInWithPassword,
  signOut,
  upsertProject
} from "./firebase.js";

const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const setupNotice = document.getElementById("setup-notice");
const sessionPanel = document.getElementById("session-panel");
const sessionEmail = document.getElementById("session-email");
const authDescription = document.getElementById("auth-description");
const form = document.getElementById("project-form");
const projectList = document.getElementById("project-admin-list");
const projectCount = document.getElementById("project-count");
const formMode = document.getElementById("form-mode");
const cancelEditButton = document.getElementById("cancel-edit");
const passwordForm = document.getElementById("password-form");
const seedProjectsButton = document.getElementById("seed-projects");
const managementPanel = document.getElementById("management-panel");

let projects = [];
let editingProjectId = null;
let currentUser = null;
let currentUserIsAdmin = false;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setSetupNotice(message) {
  setupNotice.textContent = message;
  setupNotice.classList.remove("hidden");
}

function clearSetupNotice() {
  setupNotice.textContent = "";
  setupNotice.classList.add("hidden");
}

function setEditorEnabled(enabled) {
  form.querySelectorAll("input, textarea, button").forEach((element) => {
    if (element.type === "hidden") return;
    element.disabled = !enabled;
  });
  cancelEditButton.disabled = !enabled;
}

function renderAuthState() {
  const loggedIn = Boolean(currentUser);
  const canManage = loggedIn && currentUserIsAdmin && isFirebaseConfigured;

  sessionPanel.classList.toggle("hidden", !loggedIn);
  logoutButton.classList.toggle("hidden", !loggedIn);
  loginForm.classList.toggle("hidden", loggedIn);
  managementPanel.classList.toggle("hidden", !canManage);
  sessionEmail.textContent = currentUser?.email ?? "";
  authDescription.textContent = loggedIn
    ? "로그인된 관리자 세션으로 프로젝트를 수정할 수 있습니다."
    : "먼저 로그인한 뒤 프로젝트를 관리하세요.";

  setEditorEnabled(canManage);
  passwordForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = !(loggedIn && isFirebaseConfigured);
  });
  seedProjectsButton.disabled = !canManage;
}

function formToProject() {
  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();

  return {
    id: editingProjectId || slugify(title) || crypto.randomUUID(),
    title,
    year: String(formData.get("year") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    image_url: String(formData.get("image") || "").trim(),
    image_alt: String(formData.get("alt") || "").trim() || title,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    github_url: String(formData.get("githubUrl") || "").trim(),
    live_url: String(formData.get("liveUrl") || "").trim(),
    published: Boolean(formData.get("published")),
    display_order: Number(formData.get("displayOrder") || 0)
  };
}

function resetForm() {
  form.reset();
  form.published.checked = true;
  form.displayOrder.value = 0;
  editingProjectId = null;
  formMode.textContent = "새 프로젝트 추가";
  cancelEditButton.classList.add("hidden");
}

function editProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  editingProjectId = project.id;
  form.projectId.value = project.id;
  form.title.value = project.title;
  form.year.value = project.year;
  form.alt.value = project.image_alt || "";
  form.description.value = project.description;
  form.image.value = project.image_url;
  form.tags.value = project.tags.join(", ");
  form.githubUrl.value = project.github_url || "";
  form.liveUrl.value = project.live_url || "";
  form.displayOrder.value = project.display_order ?? 0;
  form.published.checked = Boolean(project.published);
  formMode.textContent = `수정 중: ${project.title}`;
  cancelEditButton.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  const confirmed = window.confirm(`"${project.title}" 프로젝트를 삭제할까요?`);
  if (!confirmed) return;

  try {
    await removeProject(projectId);
  } catch (error) {
    window.alert(error.message || "삭제에 실패했습니다.");
    return;
  }

  if (editingProjectId === projectId) resetForm();
  await loadProjects();
}

function renderProjectCard(project) {
  const tags = project.tags.map((tag) => `<span class="rounded-full border border-white/10 px-2 py-1 text-xs text-neutral-300">${tag}</span>`).join("");

  return `
    <article class="rounded-3xl border border-white/10 bg-neutral-900/80 p-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="flex flex-1 gap-4">
          <img src="${project.image_url}" alt="${project.image_alt}" class="h-24 w-36 rounded-2xl object-cover">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-white">${project.title}</h3>
              <span class="text-xs text-neutral-500">${project.year}</span>
              <span class="rounded-full border px-2 py-1 text-[11px] ${project.published ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-neutral-700 bg-neutral-800 text-neutral-400"}">
                ${project.published ? "공개" : "비공개"}
              </span>
            </div>
            <p class="mt-2 text-sm leading-6 text-neutral-400">${project.description}</p>
            <div class="mt-3 flex flex-wrap gap-2">${tags}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" data-action="edit" data-id="${project.id}" class="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20">수정</button>
          <button type="button" data-action="delete" data-id="${project.id}" class="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20">삭제</button>
        </div>
      </div>
      <div class="mt-4 grid gap-2 text-xs text-neutral-500">
        <p>정렬 순서: ${project.display_order ?? 0}</p>
        <p>GitHub: ${project.github_url || "-"}</p>
        <p>서비스: ${project.live_url || "-"}</p>
      </div>
    </article>
  `;
}

function renderProjectList() {
  projectCount.textContent = `총 ${projects.length}개 프로젝트`;

  if (!projects.length) {
    projectList.innerHTML = `
      <div class="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center text-sm text-neutral-500">
        등록된 프로젝트가 없습니다. 왼쪽 폼에서 새 프로젝트를 추가하세요.
      </div>
    `;
    return;
  }

  projectList.innerHTML = projects.map(renderProjectCard).join("");
}

async function loadProjects() {
  const { data, error } = await listAllProjects();
  if (error) {
    projectList.innerHTML = `
      <div class="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-6 py-10 text-sm text-rose-100">
        프로젝트를 불러오지 못했습니다. ${error.message}
      </div>
    `;
    projectCount.textContent = "로드 실패";
    return;
  }

  projects = data;
  renderProjectList();
}

async function bootstrap() {
  resetForm();

  if (!isFirebaseConfigured) {
    setSetupNotice("아직 Firebase가 연결되지 않았습니다. `firebase-config.example.js`를 복사해 `firebase-config.js`를 만들고 설정값을 입력한 뒤 다시 열어주세요.");
    renderAuthState();
    projects = [];
    renderProjectList();
    return;
  }

  clearSetupNotice();
  const { user } = await getCurrentUser();
  currentUser = user;
  currentUserIsAdmin = user ? await isAdminUser(user.uid) : false;
  if (currentUser && !currentUserIsAdmin) {
    setSetupNotice("로그인은 되었지만 관리자 권한이 없습니다. Firestore의 `adminUsers/{uid}` 문서를 먼저 만들어야 합니다.");
  }
  renderAuthState();

  if (currentUserIsAdmin) {
    await loadProjects();
  } else {
    projects = [];
    renderProjectList();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isFirebaseConfigured) return;

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    await signInWithPassword(email, password);
  } catch (error) {
    window.alert(error.message || "로그인에 실패했습니다.");
    return;
  }

  loginForm.reset();
  const { user } = await getCurrentUser();
  currentUser = user;
  currentUserIsAdmin = user ? await isAdminUser(user.uid) : false;
  if (!currentUserIsAdmin) {
    setSetupNotice("로그인은 되었지만 관리자 권한이 없습니다. Firestore의 `adminUsers/{uid}` 문서를 먼저 만들어야 합니다.");
  } else {
    clearSetupNotice();
  }
  renderAuthState();
  if (currentUserIsAdmin) await loadProjects();
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut();
  } catch (error) {
    window.alert(error.message || "로그아웃에 실패했습니다.");
    return;
  }

  currentUser = null;
  currentUserIsAdmin = false;
  projects = [];
  resetForm();
  renderAuthState();
  renderProjectList();
  passwordForm.reset();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !currentUserIsAdmin) return;

  try {
    await upsertProject(formToProject(), currentUser.uid);
  } catch (error) {
    window.alert(error.message || "저장에 실패했습니다.");
    return;
  }

  await loadProjects();
  resetForm();
});

projectList.addEventListener("click", async (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;

  const { action, id } = target.dataset;
  if (action === "edit") editProject(id);
  if (action === "delete") await deleteProject(id);
});

cancelEditButton.addEventListener("click", resetForm);

seedProjectsButton.addEventListener("click", async () => {
  if (!currentUser || !currentUserIsAdmin) return;

  const confirmed = window.confirm("기본 프로젝트 4개를 Firestore에 추가할까요? 같은 ID가 있으면 최신 내용으로 덮어씁니다.");
  if (!confirmed) return;

  try {
    for (const project of getDefaultProjects()) {
      await upsertProject(project, currentUser.uid);
    }
  } catch (error) {
    window.alert(error.message || "기본 프로젝트를 추가하지 못했습니다.");
    return;
  }

  await loadProjects();
  window.alert("기본 프로젝트를 추가했습니다.");
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const formData = new FormData(passwordForm);
  const currentPassword = String(formData.get("currentPassword") || "");
  const nextPassword = String(formData.get("nextPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (nextPassword.length < 6) {
    window.alert("새 비밀번호는 6자 이상이어야 합니다.");
    return;
  }

  if (nextPassword !== confirmPassword) {
    window.alert("새 비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  try {
    await changeCurrentUserPassword(currentPassword, nextPassword);
  } catch (error) {
    window.alert(error.message || "비밀번호 변경에 실패했습니다.");
    return;
  }

  passwordForm.reset();
  window.alert("비밀번호를 변경했습니다.");
});

onAuthChange(async (session) => {
  currentUser = session?.user ?? null;
  currentUserIsAdmin = currentUser ? await isAdminUser(currentUser.uid) : false;
  renderAuthState();
  if (currentUserIsAdmin) {
    clearSetupNotice();
    await loadProjects();
  } else if (currentUser) {
    setSetupNotice("로그인은 되었지만 관리자 권한이 없습니다. Firestore의 `adminUsers/{uid}` 문서를 먼저 만들어야 합니다.");
    projects = [];
    renderProjectList();
  }
});

bootstrap();
