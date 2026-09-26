import React, { useEffect, useState } from 'react';
import TitleBar from './components/layout/TitleBar';
import SideBar from './components/layout/SideBar';
import Workspace from './components/layout/Workspace';
import Inspector from './components/layout/Inspector';
import StatusBar from './components/layout/StatusBar';
import ApiKeyModal from './components/ai/ApiKeyModal';
import AiResultPanel from './components/ai/AiResultPanel';
import ChatHistoryModal from './components/ai/ChatHistoryModal';
import ExportModal from './components/export/ExportModal';
import ResetModal from './components/ui/ResetModal';
import FirebaseSetupModal from './components/community/FirebaseSetupModal';
import ShareModal from './components/community/ShareModal';
import CommunityBrowser from './components/community/CommunityBrowser';
import useUIStore from './store/uiStore';
import useCommunityStore from './store/communityStore';
import useAutosave from './hooks/useAutosave';
import { tryAutoInit } from './lib/geminiService';
import { tryAutoInitFirebase } from './api/firebase';

/**
 * App - 메인 애플리케이션 루트 컴포넌트
 */
function App() {
    const { sidebarOpen, inspectorOpen, modal, closeModal } = useUIStore();
    const { setFirebaseConfigured } = useCommunityStore();

    const [showResetModal, setShowResetModal] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);

    useAutosave();

    useEffect(() => {
        tryAutoInit();
        const fbOk = tryAutoInitFirebase();
        setFirebaseConfigured(fbOk);
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-discord-bg-primary overflow-hidden">
            <TitleBar
                onOpenReset={() => setShowResetModal(true)}
                onOpenChatHistory={() => setShowChatHistory(true)}
            />

            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && <SideBar />}
                <Workspace />
                {inspectorOpen && <Inspector />}
            </div>

            <StatusBar />

            {/* AI */}
            <ApiKeyModal />
            <AiResultPanel />
            <ChatHistoryModal isOpen={showChatHistory} onClose={() => setShowChatHistory(false)} />

            {/* Export */}
            <ExportModal isOpen={modal?.type === 'export'} onClose={closeModal} />

            {/* Reset */}
            <ResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />

            {/* Community */}
            <FirebaseSetupModal />
            <ShareModal />
            <CommunityBrowser />
        </div>
    );
}

export default App;
