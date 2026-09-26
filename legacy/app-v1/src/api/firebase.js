import { initializeApp } from 'firebase/app';
import {
    getFirestore, collection, doc, getDoc, getDocs,
    setDoc, updateDoc, deleteDoc, query, where, orderBy,
    limit, increment, serverTimestamp,
} from 'firebase/firestore';

/**
 * Firebase 초기화 및 Firestore 관련 API
 * 
 * 사용자가 Settings에서 Firebase 설정을 입력하면 초기화됩니다.
 * 설정이 없으면 커뮤니티 기능이 비활성화됩니다.
 */

const FIREBASE_STORAGE_KEY = 'hybrid-bot-builder-firebase-config';

let app = null;
let db = null;

// ── Firebase 초기화 ────────────────────────
export function initFirebase(config) {
    try {
        app = initializeApp(config);
        db = getFirestore(app);
        localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export function tryAutoInitFirebase() {
    try {
        const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
        if (!raw) return false;
        const config = JSON.parse(raw);
        const result = initFirebase(config);
        return result.success;
    } catch {
        return false;
    }
}

export function isFirebaseReady() {
    return db !== null;
}

export function clearFirebaseConfig() {
    localStorage.removeItem(FIREBASE_STORAGE_KEY);
    app = null;
    db = null;
}

// ── Dual-ID 생성 ───────────────────────────
// readId: 공유용 (누구나 이 ID로 조회 가능)
// editId: 수정/삭제용 (작성자만 알고 있음)
function generateId(prefix = '') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = prefix;
    for (let i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// ── 청사진 업로드 ──────────────────────────
export async function uploadBlueprint({ name, description, author, canvasData, tags = [] }) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');

    const readId = generateId('bp_');
    const editId = generateId('ed_');

    const blueprint = {
        readId,
        editId,
        name,
        description,
        author: author || 'Anonymous',
        tags,
        canvas: JSON.stringify(canvasData),
        nodeCount: canvasData?.nodes?.length || 0,
        edgeCount: canvasData?.edges?.length || 0,
        downloads: 0,
        likes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'blueprints', readId), blueprint);

    return { readId, editId };
}

// ── 청사진 조회 ────────────────────────────
export async function getBlueprint(readId) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');

    const docRef = doc(db, 'blueprints', readId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('청사진을 찾을 수 없습니다.');

    // 다운로드 카운트 증가
    await updateDoc(docRef, { downloads: increment(1) });

    const data = docSnap.data();
    return {
        ...data,
        canvas: JSON.parse(data.canvas || '{}'),
        editId: undefined, // 보안: editId는 반환하지 않음
    };
}

// ── 청사진 수정 ────────────────────────────
export async function updateBlueprint(readId, editId, updates) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');

    const docRef = doc(db, 'blueprints', readId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('청사진을 찾을 수 없습니다.');
    if (docSnap.data().editId !== editId) throw new Error('수정 권한이 없습니다.');

    const safeUpdates = {};
    if (updates.name) safeUpdates.name = updates.name;
    if (updates.description) safeUpdates.description = updates.description;
    if (updates.tags) safeUpdates.tags = updates.tags;
    if (updates.canvasData) {
        safeUpdates.canvas = JSON.stringify(updates.canvasData);
        safeUpdates.nodeCount = updates.canvasData?.nodes?.length || 0;
        safeUpdates.edgeCount = updates.canvasData?.edges?.length || 0;
    }
    safeUpdates.updatedAt = serverTimestamp();

    await updateDoc(docRef, safeUpdates);
    return { success: true };
}

// ── 청사진 삭제 ────────────────────────────
export async function deleteBlueprint(readId, editId) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');

    const docRef = doc(db, 'blueprints', readId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error('청사진을 찾을 수 없습니다.');
    if (docSnap.data().editId !== editId) throw new Error('삭제 권한이 없습니다.');

    await deleteDoc(docRef);
    return { success: true };
}

// ── 청사진 목록 (인기순 / 최신순) ──────────
export async function listBlueprints({ sortBy = 'downloads', maxResults = 20, searchTag = '' } = {}) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');

    let q;
    const col = collection(db, 'blueprints');

    if (searchTag) {
        q = query(
            col,
            where('tags', 'array-contains', searchTag),
            orderBy(sortBy, 'desc'),
            limit(maxResults)
        );
    } else {
        q = query(
            col,
            orderBy(sortBy, 'desc'),
            limit(maxResults)
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            readId: data.readId,
            name: data.name,
            description: data.description,
            author: data.author,
            tags: data.tags || [],
            nodeCount: data.nodeCount,
            downloads: data.downloads,
            likes: data.likes,
            createdAt: data.createdAt?.toDate?.() || null,
        };
    });
}

// ── 좋아요 ─────────────────────────────────
export async function likeBlueprint(readId) {
    if (!db) throw new Error('Firebase가 초기화되지 않았습니다.');
    const docRef = doc(db, 'blueprints', readId);
    await updateDoc(docRef, { likes: increment(1) });
}
