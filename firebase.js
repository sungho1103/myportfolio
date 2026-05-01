import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
  ,
  updatePassword as firebaseUpdatePassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  collection,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const defaultProjects = [
  {
    id: "ecommerce-platform",
    title: "E-Commerce Platform",
    year: "2025",
    description: "React와 Node.js를 사용한 풀스택 쇼핑몰 플랫폼. 결제 시스템 연동 및 실시간 재고 관리 기능 구현.",
    image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
    image_urls: ["https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80"],
    image_alt: "E-Commerce Platform",
    tags: ["React", "Node.js", "MongoDB", "Stripe"],
    github_url: "https://github.com",
    live_url: "https://example.com",
    published: true,
    display_order: 40
  },
  {
    id: "task-management-app",
    title: "Task Management App",
    year: "2024",
    description: "팀 협업을 위한 칸반 보드 기반 태스크 관리 애플리케이션. 실시간 동기화 및 알림 기능.",
    image_url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&q=80",
    image_urls: ["https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&q=80"],
    image_alt: "Task Management App",
    tags: ["Next.js", "TypeScript", "PostgreSQL", "WebSocket"],
    github_url: "https://github.com",
    live_url: "https://example.com",
    published: true,
    display_order: 30
  },
  {
    id: "portfolio-generator",
    title: "Portfolio Generator",
    year: "2024",
    description: "개발자를 위한 포트폴리오 웹사이트 자동 생성 서비스. 마크다운 기반의 콘텐츠 관리.",
    image_url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80",
    image_urls: ["https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80"],
    image_alt: "Portfolio Generator",
    tags: ["React", "Tailwind CSS", "Firebase"],
    github_url: "https://github.com",
    live_url: "",
    published: true,
    display_order: 20
  },
  {
    id: "weather-dashboard",
    title: "Weather Dashboard",
    year: "2023",
    description: "OpenWeather API를 활용한 날씨 대시보드. 위치 기반 예보 및 데이터 시각화.",
    image_url: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80",
    image_urls: ["https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80"],
    image_alt: "Weather Dashboard",
    tags: ["Vue.js", "Chart.js", "REST API"],
    github_url: "",
    live_url: "https://example.com",
    published: true,
    display_order: 10
  }
];

const loadedConfig = window.FIREBASE_CONFIG ?? null;

export const isFirebaseConfigured = Boolean(
  loadedConfig?.apiKey &&
  loadedConfig?.authDomain &&
  loadedConfig?.projectId &&
  loadedConfig?.appId
);

const app = isFirebaseConfigured ? initializeApp(loadedConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export function getDefaultProjects() {
  return defaultProjects.map((project) => ({
    ...project,
    tags: [...project.tags],
    image_urls: [...(project.image_urls || [])]
  }));
}

function normalizeImageUrls(project) {
  const candidates = Array.isArray(project.image_urls)
    ? project.image_urls
    : Array.isArray(project.imageUrls)
      ? project.imageUrls
      : [project.image_url || project.image || ""];

  return candidates
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function toProjectRecord(project) {
  const image_urls = normalizeImageUrls(project);

  return {
    id: project.id || crypto.randomUUID(),
    title: String(project.title || "").trim(),
    year: String(project.year || "").trim(),
    description: String(project.description || "").trim(),
    image_url: image_urls[0] || "",
    image_urls,
    image_source: String(project.image_source || project.imageSource || "manual").trim() || "manual",
    image_alt: String(project.image_alt || project.alt || project.title || "").trim(),
    tags: Array.isArray(project.tags) ? project.tags.filter(Boolean) : [],
    github_url: String(project.github_url || project.githubUrl || "").trim(),
    live_url: String(project.live_url || project.liveUrl || "").trim(),
    published: Boolean(project.published ?? true),
    display_order: Number(project.display_order ?? project.displayOrder ?? 0)
  };
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => toProjectRecord({ id: item.id, ...item.data() }));
}

export async function listPublishedProjects() {
  if (!db) return { data: getDefaultProjects(), fallback: true, error: null };

  try {
    const projectsQuery = query(collection(db, "projects"), where("published", "==", true));
    const snapshot = await getDocs(projectsQuery);
    const data = mapSnapshot(snapshot).sort((a, b) => (b.display_order ?? 0) - (a.display_order ?? 0));
    return { data, fallback: false, error: null };
  } catch (error) {
    return { data: getDefaultProjects(), fallback: true, error };
  }
}

export async function listAllProjects() {
  if (!db) return { data: getDefaultProjects(), fallback: true, error: null };

  try {
    const projectsQuery = query(collection(db, "projects"), orderBy("display_order", "desc"));
    const snapshot = await getDocs(projectsQuery);
    return { data: mapSnapshot(snapshot), fallback: false, error: null };
  } catch (error) {
    return { data: [], fallback: false, error };
  }
}

export async function signInWithPassword(email, password) {
  if (!auth) throw new Error("Firebase is not configured");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  if (!auth) return;
  return firebaseSignOut(auth);
}

export async function changeCurrentUserPassword(currentPassword, nextPassword) {
  if (!auth?.currentUser) throw new Error("로그인된 사용자가 없습니다.");

  const email = auth.currentUser.email;
  if (!email) throw new Error("현재 계정의 이메일 정보를 확인할 수 없습니다.");

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await firebaseUpdatePassword(auth.currentUser, nextPassword);
}

export async function getCurrentUser() {
  if (!auth) return { user: null };
  return { user: auth.currentUser };
}

export function onAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function isAdminUser(uid) {
  if (!db || !uid) return false;
  const snapshot = await getDoc(doc(db, "adminUsers", uid));
  return snapshot.exists();
}

export async function upsertProject(project, userId) {
  if (!db) throw new Error("Firebase is not configured");
  const payload = {
    ...toProjectRecord(project),
    updated_at: serverTimestamp(),
    updated_by: userId || null
  };

  await setDoc(doc(db, "projects", payload.id), payload, { merge: true });
}

export async function removeProject(projectId) {
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, "projects", projectId));
}
