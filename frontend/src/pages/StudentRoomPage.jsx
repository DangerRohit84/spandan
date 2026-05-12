import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'
import useRoomStore from '../stores/roomStore'
import { Header, Button, LoadingSpinner, Alert } from '../components/ui'

function StudentRoomPage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const { socket, isConnected, joinRoom, leaveRoom } = useSocketStore()
  const { joinRoomByCode, setAuthToken } = useRoomStore()
  
  const [room, setRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (token) {
      setAuthToken(token)
      joinSession()
    }
    return () => {
      if (room?.code) {
        leaveRoom(room.code)
      }
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleQuestionStarted = (data) => {
      setCurrentQuestion(data)
      setSelectedOption(null)
      setSubmitted(false)
      setTimeLeft(data.timer)
      
      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    const handleQuestionEnded = (data) => {
      setResults(data.results)
      setCurrentQuestion(null)
    }

    socket.on('question:started', handleQuestionStarted)
    socket.on('question:ended', handleQuestionEnded)

    return () => {
      socket.off('question:started', handleQuestionStarted)
      socket.off('question:ended', handleQuestionEnded)
    }
  }, [socket])

  const joinSession = async () => {
    setIsLoading(true)
    try {
      const roomData = await joinRoomByCode(roomCode)
      setRoom(roomData)
      if (user?._id) {
        joinRoom(roomData.code, user._id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitAnswer = () => {
    if (selectedOption === null || submitted) return

    socket.emit('response:submit', {
      roomCode: room.code,
      questionId: currentQuestion.questionId,
      studentId: user._id,
      selectedOption,
      responseTime: currentQuestion.timer - timeLeft
    })

    setSubmitted(true)
  }

  const leaveSession = () => {
    if (room?.code) {
      leaveRoom(room.code)
    }
    navigate('/student')
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header title="Joining Session..." subtitle="Student View" />
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner message="Joining classroom session..." />
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header title="Session Error" subtitle="Student View" />
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
          <Alert type="error" message={error || 'Failed to join session'} />
          <div style={{ textAlign: 'center' }}>
            <Button onClick={() => navigate('/student')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header title={room.name} subtitle="Live Session" />
      
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
        {/* Room Info */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Room Code: <strong style={{ color: '#1e40af', fontSize: '18px' }}>{room.code}</strong>
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444'
            }}></div>
            <span style={{ fontSize: '14px', color: isConnected ? '#059669' : '#dc2626' }}>
              {isConnected ? 'Connected to session' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Live Question or Waiting State */}
        {currentQuestion ? (
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '16px',
            padding: '32px',
            color: 'white',
            boxShadow: '0 10px 40px rgba(124, 58, 237, 0.3)'
          }}>
            {/* Timer */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                position: 'relative'
              }}>
                <span style={{ fontSize: '36px', fontWeight: '700' }}>{timeLeft}</span>
                {timeLeft <= 5 && (
                  <div style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    border: '4px solid #ef4444',
                    animation: 'pulse 1s infinite'
                  }}></div>
                )}
              </div>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>seconds remaining</p>
            </div>

            {/* Question */}
            <h2 style={{ fontSize: '24px', fontWeight: '700', textAlign: 'center', marginBottom: '32px' }}>
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {currentQuestion.options && currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index
                const showCorrect = results && results[index]
                
                return (
                  <button
                    key={index}
                    onClick={() => !submitted && setSelectedOption(index)}
                    disabled={submitted}
                    style={{
                      padding: '20px 24px',
                      background: submitted 
                        ? (showCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)')
                        : (isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'),
                      border: `2px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '18px',
                      textAlign: 'left',
                      cursor: submitted ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <span style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isSelected ? '#ffd700' : 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      color: isSelected ? '#1f2937' : 'white'
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {submitted && showCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Submit Button or Result */}
            {submitted ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px'
              }}>
                <p style={{ fontSize: '18px', fontWeight: '600' }}>✓ Answer Submitted</p>
                <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px' }}>
                  Waiting for next question...
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={selectedOption === null}
                onClick={handleSubmitAnswer}
                style={{
                  width: '100%',
                  background: selectedOption !== null ? '#ffd700' : 'rgba(255,255,255,0.2)',
                  color: selectedOption !== null ? '#1f2937' : 'rgba(255,255,255,0.5)',
                  border: 'none'
                }}
              >
                Submit Answer
              </Button>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#eff6ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              ⏳
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
              Waiting for Next Question
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              The teacher will start a poll soon. Stay tuned!
            </p>
            {results && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Results from last question:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.entries(results).map(([option, count]) => (
                    <div key={option} style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      Option {String.fromCharCode(65 + parseInt(option))}: {count} votes
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button variant="secondary" onClick={leaveSession}>
              Leave Session
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          background: '#eff6ff',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px',
          border: '1px solid #bfdbfe'
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>
            💡 Tips for Success
          </h4>
          <ul style={{ color: '#3b82f6', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
            <li>Read each question carefully before selecting your answer</li>
            <li>Submit your answer before the timer runs out</li>
            <li>Stay focused - questions appear without warning!</li>
          </ul>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default StudentRoomPage