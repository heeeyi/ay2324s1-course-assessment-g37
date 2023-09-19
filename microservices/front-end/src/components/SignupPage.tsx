import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './SignupPage.css'

// Do not allow editing of roles, default to "basic"
const SignupPage: React.FC = () => {
    const [username, setUsername] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");
    const [password, setPassword] = useState<string>("");   
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [role, setRole] = useState<"basic" | "admin">("basic");

    const navigate = useNavigate();

    const handleSignup = async () => {
        if (!username || !displayName || !password) {
            alert("Required fields not filled up");
            return;
        }

        if (password != confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        try {
            const response = await axios.post("/api/auth/sign-up", {
                username,
                displayName,
                password,
                role
            });

            if (response.status == 200) {
                navigate('/login');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error('Signup failed:', error);
                if (error.response && error.response.status === 401) {
                    alert("Failed to create account")
                }
            } else {
                console.error('An unknown error occurred:', error);
            }
        }

    };

    const handleCancel = () => {
        setUsername('');
        setDisplayName('');
        setPassword('');
        setConfirmPassword('');
        setRole('basic');
        navigate('/login');
    };

    return (
        <div className='signup-container'>
            <h1 className='signup-header'>Signup Page</h1>

            <div className='input-field'>
                <label htmlFor="username">Username</label>
                <input 
                id="username" 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                />
            </div>
            <div className='input-field'>
                <label htmlFor="displayName">Display Name</label>
                <input 
                id="displayName" 
                type="text" 
                value={displayName} 
                onChange={(e) => setUsername(e.target.value)} 
                />
            </div>
            <div className='input-field'>
                <label htmlFor="password">Password</label>
                <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                />
            </div>
            <div className='input-field'>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                />
            </div>
            <button className='action-button' onClick={handleSignup}>Sign Up</button>
            <button className='action-button' onClick={handleCancel}>Cancel</button>
        </div>
    );
};

export default SignupPage;
