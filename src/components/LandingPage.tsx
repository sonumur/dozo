import React from 'react';

interface LandingPageProps {
    onStart: (mode: 'text' | 'video') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '800px', margin: '0 auto', position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo.png" alt="Dozu Logo" className="app-logo" />
            <h1>Dozu</h1>
            <div className="logo-sub">Talk to strangers!</div>

            <div style={{ margin: '40px 0', padding: '20px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', textAlign: 'left' }}>
                <p style={{ marginBottom: '15px' }}>
                    Dozu is a great way to meet new friends. When you use Dozu, we pick someone else at random so you can have a one-on-one chat.
                </p>
                <p>
                    Chats are anonymous unless you tell someone who you are, although it is not recommended.
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ marginBottom: '10px', fontSize: '18px' }}>Start chatting:</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="btn-start" onClick={() => onStart('text')}>Text</button>
                        <p style={{ padding: '20px 0' }}>or</p>
                        <button className="btn-start" style={{ backgroundColor: '#cc0000', borderColor: '#aa0000' }} onClick={() => onStart('video')}>Video</button>
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, fontSize: '12px', color: '#666' }}>
                By using Dozu, you accept our terms. Stay safe!
            </div>
        </div>
    );
};

export default LandingPage;
