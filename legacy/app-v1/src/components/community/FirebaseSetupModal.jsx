import React, { useState, useEffect } from 'react';
import { Database, ExternalLink, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import useCommunityStore from '../../store/communityStore';
import { initFirebase, isFirebaseReady, clearFirebaseConfig } from '../../api/firebase';
import Button from '../ui/Button';

/**
 * FirebaseSetupModal - Firebase 프로젝트 설정 모달
 */
function FirebaseSetupModal() {
    const { showFirebaseSetup, closeFirebaseSetup, setFirebaseConfigured } = useCommunityStore();
    const [config, setConfig] = useState({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
    });
    const [status, setStatus] = useState(''); // 'success' | 'error' | ''
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (showFirebaseSetup) {
            setStatus('');
            setErrorMsg('');
            // 저장된 설정 로드
            try {
                const raw = localStorage.getItem('hybrid-bot-builder-firebase-config');
                if (raw) {
                    const saved = JSON.parse(raw);
                    setConfig(saved);
                }
            } catch { }
        }
    }, [showFirebaseSetup]);

    const handleChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleConnect = () => {
        if (!config.apiKey || !config.projectId) {
            setErrorMsg('API Key와 Project ID는 필수입니다.');
            setStatus('error');
            return;
        }

        const result = initFirebase(config);
        if (result.success) {
            setFirebaseConfigured(true);
            setStatus('success');
            setTimeout(() => closeFirebaseSetup(), 1000);
        } else {
            setErrorMsg(result.error);
            setStatus('error');
        }
    };

    const handleClear = () => {
        clearFirebaseConfig();
        setFirebaseConfigured(false);
        setConfig({ apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
        setStatus('');
    };

    if (!showFirebaseSetup) return null;

    const fields = [
        { key: 'apiKey', label: 'API Key', required: true },
        { key: 'authDomain', label: 'Auth Domain' },
        { key: 'projectId', label: 'Project ID', required: true },
        { key: 'storageBucket', label: 'Storage Bucket' },
        { key: 'messagingSenderId', label: 'Messaging Sender ID' },
        { key: 'appId', label: 'App ID' },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && closeFirebaseSetup()}
        >
            <div className="max-w-md w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#202225]">
                    <div className="w-9 h-9 rounded-md-discord bg-[#FFA611] flex items-center justify-center">
                        <Database size={18} strokeWidth={2} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-discord-header-primary">Firebase 설정</h2>
                        <p className="text-[11px] text-discord-text-muted">커뮤니티 기능에 사용할 Firebase 프로젝트를 연결합니다</p>
                    </div>
                </div>

                {/* Guide */}
                <div className="px-5 py-3 bg-discord-bg-secondary border-b border-[#202225]">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={14} strokeWidth={2} className="text-[#FAA61A] mt-0.5 flex-shrink-0" />
                        <div className="text-[12px] text-discord-text-normal leading-relaxed">
                            <p className="font-semibold text-discord-header-secondary mb-1">Firebase 프로젝트 설정 방법</p>
                            <ol className="list-decimal list-inside space-y-0.5 text-discord-text-muted">
                                <li>Firebase Console에서 새 프로젝트 생성</li>
                                <li>Firestore Database 활성화 (테스트 모드)</li>
                                <li>프로젝트 설정 → 웹 앱 추가 → 설정값 복사</li>
                            </ol>
                        </div>
                    </div>
                    <a
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-[#FFA611] hover:text-white hover:bg-[#FFA611] transition-colors group"
                    >
                        <ExternalLink size={13} strokeWidth={2} />
                        <span className="font-medium">Firebase Console 열기</span>
                        <span className="text-[10px] text-discord-text-muted group-hover:text-white/60 ml-auto">console.firebase.google.com</span>
                    </a>
                </div>

                {/* Config Fields */}
                <div className="px-5 py-3 space-y-2.5 max-h-[300px] overflow-y-auto">
                    {fields.map((f) => (
                        <div key={f.key}>
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">
                                {f.label} {f.required && <span className="text-discord-red">*</span>}
                            </label>
                            <input
                                type="text"
                                value={config[f.key]}
                                onChange={(e) => handleChange(f.key, e.target.value)}
                                placeholder={f.label}
                                className="w-full h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted font-mono focus:outline-none focus:border-discord-blurple transition-colors"
                            />
                        </div>
                    ))}
                </div>

                {/* Status */}
                {status === 'success' && (
                    <div className="px-5 py-2 text-[11px] text-discord-green flex items-center gap-1.5">
                        <CheckCircle size={12} /> Firebase 연결 완료!
                    </div>
                )}
                {status === 'error' && (
                    <div className="px-5 py-2 text-[11px] text-discord-red flex items-center gap-1.5">
                        <XCircle size={12} /> {errorMsg}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#202225]">
                    <div>
                        {isFirebaseReady() && (
                            <Button variant="danger" size="sm" icon={Trash2} onClick={handleClear}>연결 해제</Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={closeFirebaseSetup}>취소</Button>
                        <Button variant="primary" size="sm" icon={Database} onClick={handleConnect}>연결</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FirebaseSetupModal;
