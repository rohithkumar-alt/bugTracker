"use client";
import { motion } from 'framer-motion';
import { Bug } from 'lucide-react';

export default function LoadingOverlay({ 
  message = "Synchronizing", 
  subtext = "Accessing encrypted data stream...",
  fullPage = false // Add flag for cases where we DO want full screen (like cold boot)
}) {
  const containerStyle = fullPage ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-bg-body)',
    zIndex: 9999
  } : {
    width: '100%',
    height: '75vh', // Takes up most of the content area
    display: 'flex',
    backgroundColor: 'transparent'
  };

  return (
    <div style={{
      ...containerStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px'
    }}>
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: 'var(--color-bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
          color: '#2563eb',
          border: '1px solid var(--color-border)'
        }}
      >
        <Bug size={40} strokeWidth={2.5} />
      </motion.div>
      
      <div style={{ textAlign: 'center' }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '0.8rem',
            fontWeight: '800',
            color: 'var(--color-text-main)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em'
          }}
        >
          {message}
        </motion.p>
        {subtext && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-light)',
              fontWeight: '500',
              marginTop: '4px'
            }}
          >
            {subtext}
          </motion.p>
        )}
        <div style={{ 
          marginTop: '16px', 
          width: '100px', 
          height: '3px', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '99px',
          overflow: 'hidden',
          margin: '16px auto 0'
        }}>
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ width: '60%', height: '100%', backgroundColor: '#2563eb' }}
          />
        </div>
      </div>
    </div>
  );
}
