import React from 'react';

interface LandingPageProps {
    onStart: (mode: 'text' | 'video') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '900px', margin: '0 auto', position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo.png" alt="Dozu Logo" className="app-logo" style={{ width: '80px', height: 'auto', marginBottom: '10px' }} />
            <h1 style={{ fontSize: '3rem', marginBottom: '5px' }}>Dozu</h1>
            <h2 className="logo-sub" style={{ fontSize: '1.2rem', color: '#666', fontWeight: 'normal', marginBottom: '40px' }}>
                The Ultimate Omegle Alternative for Anonymous Chat
            </h2>

            <section style={{ margin: '20px 0', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', margin: '40px 0' }}>
                    <div style={{ flex: 1, backgroundColor: '#fcfcfc', padding: '30px', border: '2px solid #0044cc', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,68,204,0.1)' }}>
                        <h3 style={{ marginBottom: '15px', fontSize: '22px' }}>Start Chatting Instantly</h3>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button className="btn-start" onClick={() => onStart('text')} style={{ padding: '15px 35px' }}>Text Chat</button>
                            <button className="btn-start" style={{ backgroundColor: '#cc0000', borderColor: '#aa0000', padding: '15px 35px' }} onClick={() => onStart('video')}>Video Chat</button>
                        </div>
                        <p style={{ marginTop: '15px', fontSize: '14px', color: '#555' }}>
                            100% Free · No Registration · Encrypted
                        </p>
                    </div>
                </div>
            </section>

            <section style={{ textAlign: 'left', margin: '40px 0', lineHeight: '1.6', color: '#333' }}>
                <h3 style={{ fontSize: '28px', color: '#0044cc', marginBottom: '20px' }}>What is Dozu?</h3>
                <p style={{ marginBottom: '15px' }}>
                    Looking for a safe and fast **Omegle alternative**? Dozu is a leading global platform for **anonymous random video chat**. We connect you with strangers from around the world instantly, allowing you to have meaningful or fun conversations without revealing your identity.
                </p>
                <p style={{ marginBottom: '30px' }}>
                    Since the closure of Omegle, millions of users have been searching for a reliable **random chat app**. Dozu fills that gap by providing a seamless, no-registration experience for both text and video communication.
                </p>

                <h3 style={{ fontSize: '28px', color: '#0044cc', marginBottom: '20px' }}>Why Choose Dozu for Random Chat?</h3>
                <ul style={{ paddingLeft: '20px', marginBottom: '30px' }}>
                    <li style={{ marginBottom: '10px' }}><strong>Complete Anonymity:</strong> You don't need to create an account. Just click start and meet someone new.</li>
                    <li style={{ marginBottom: '10px' }}><strong>High Speed Pairing:</strong> Our advanced matching algorithm finds you a partner in milliseconds.</li>
                    <li style={{ marginBottom: '10px' }}><strong>Safe Environment:</strong> We utilize modern WebRTC technologies for direct Peer-to-Peer connections, keeping your data private.</li>
                    <li style={{ marginBottom: '10px' }}><strong>Global Community:</strong> Meet people from different cultures, countries, and backgrounds.</li>
                </ul>

                <h3 style={{ fontSize: '28px', color: '#0044cc', marginBottom: '20px' }}>Dozu FAQ</h3>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '18px', marginBottom: '5px' }}>Is Dozu free to use?</h4>
                        <p>Yes, Dozu is 100% free. We offer random video and text chat without any hidden fees or subscriptions.</p>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '18px', marginBottom: '5px' }}>Do I need to sign up?</h4>
                        <p>No registration is required. We value your privacy and believe in instant connectivity.</p>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '18px', marginBottom: '5px' }}>is it safe to talk to strangers on Dozu?</h4>
                        <p>We provide a direct P2P connection (WebRTC). However, always remember to never share personal information (like your address or credit card) with strangers online.</p>
                    </div>
                </div>
            </section>

            <div style={{ margin: '40px 0', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '20px', width: '100%' }}>
                © 2024 Dozu - The Best Omegle Alternative for Anonymous Random Video Chat. All rights reserved.
                <br />
                By using Dozu, you accept our community guidelines. Stay safe and be respectful!
            </div>
        </div>
    );
};

export default LandingPage;
