import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'
import useRoomStore from '../stores/roomStore'
import { Header, Button, Input, Modal, Alert, LoadingSpinner } from '../components/ui'

function RoomDetailPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const { socket, isConnected, currentRoom, participants, joinRoom, leaveRoom } = useSocketStore()
  const { getRoom, updateRoom, setAuthToken } = useRoomStore()
  
  const [room, setRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [responses, setResponses] = useState([])
  
  // Question form state
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctOption, setCorrectOption] = useState(0)
  const [timer, setTimer] = useState(30)

  useEffect(() => {
    if (token) {
      setAuthToken(token)
      loadRoom()
    }
    return () => {
      if (room?.code) {
        leaveRoom(room.code)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (room?.code && user?._id) {
      joinRoom(room.code, user._id)
    }
  }, [room?.code, user?._id])

  useEffect(() => {
    if (!socket) return

    const handleQuestionStarted = (data) => {
      setCurrentQuestion(data)
      setResponses([])
    }

    const handleQuestionEnded = (data) => {
      setCurrentQuestion(null)
      setResponses(data.results || {})
    }

    const handleResponseNew = (data) => {
      setResponses(prev => [...prev, data])
    }

    const handleRoomJoined = (data) => {
      console.log('Room joined:', data)
    }

    socket.on('question:started', handleQuestionStarted)
    socket.on('question:ended', handleQuestionEnded)
    socket.on('response:new', handleResponseNew)
    socket.on('room:joined', handleRoomJoined)

    return () => {
      socket.off('question:started', handleQuestionStarted)
      socket.off('question:ended', handleQuestionEnded)
      socket.off('response:new', handleResponseNew)
      socket.off('room:joined', handleRoomJoined)
    }
  }, [socket])

  const loadRoom = async () => {
    setIsLoading(true)
    try {
      const roomData = await getRoom(roomId)
      setRoom(roomData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRoom = async () => {
    try {
      const updated = await updateRoom(room._id, { isActive: !room.isActive })
      setRoom(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreateQuestion = () => {
    if (!questionText.trim() || options.filter(o => o.trim()).length < 2) {
      setError('Please enter a question and at least 2 options')
      return
    }

    const newQuestion = {
      id: Date.now(),
      question: questionText,
      options: options.filter(o => o.trim()),
      correctOption,
      timer,
      isActive: false
    }

    setQuestions([...questions, newQuestion])
    setShowQuestionModal(false)
    resetQuestionForm()
  }

  const resetQuestionForm = () => {
    setQuestionText('')
    setOptions(['', '', '', ''])
    setCorrectOption(0)
    setTimer(30)
  }

  const handleStartQuestion = (question) => {
    setCurrentQuestion({ ...question, startTime: Date.now() })
    socket.emit('question:start', {
      roomCode: room.code,
      questionId: question.id,
      question: question.question,
      timer: question.timer
    })
  }

  const handleEndQuestion = () => {
    socket.emit('question:end', {
      roomCode: room.code,
      questionId: currentQuestion.id,
      results: responses.reduce((acc, r) => {
        acc[r.selectedOption] = (acc[r.selectedOption] || 0) + 1
        return acc
      }, {})
    })
    setCurrentQuestion(null)
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code)
    alert('Room code copied to clipboard!')
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header title="Loading..." />
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner message="Loading room..." />
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header title="Room Not Found" />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Alert type="error" message={error || 'Room not found'} />
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header title={room.name} subtitle="Assessment Space" />
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        {error && <Alert type="error" message={error} />}

        {/* Room Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Room Code</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af', letterSpacing: '4px' }}>
                    {room.code}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    style={{
                      padding: '8px 12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#1e40af'
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Status</p>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: room.isActive ? '#d1fae5' : '#f3f4f6',
                  color: room.isActive ? '#059669' : '#6b7280'
                }}>
                  {room.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Participants</p>
                <span style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
                  {participants}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant={room.isActive ? 'secondary' : 'success'} onClick={handleToggleRoom}>
                {room.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="primary" onClick={() => setShowQuestionModal(true)}>
                + Add Question
              </Button>
            </div>
          </div>
        </div>

        {/* Live Question Display */}
        {currentQuestion && (
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '16px',
            padding: '32px',
            color: 'white',
            marginBottom: '24px',
            boxShadow: '0 10px 40px rgba(124, 58, 237, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>🔴 LIVE</span>
                <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '8px 0 0 0' }}>
                  {currentQuestion.question}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>Time Remaining</p>
                <span style={{ fontSize: '36px', fontWeight: '700' }}>{currentQuestion.timer}s</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    fontSize: '16px'
                  }}
                >
                  <strong>{String.fromCharCode(65 + index)}.</strong> {option}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{responses.length} responses</span>
              <Button variant="danger" onClick={handleEndQuestion}>
                End Question
              </Button>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
            Questions ({questions.length})
          </h3>
          
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📝</span>
              <p>No questions yet. Add your first question!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '12px' }}>#{index + 1}</span>
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>{q.question}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '12px' }}>
                      {q.options.length} options • {q.timer}s
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={currentQuestion !== null}
                    onClick={() => handleStartQuestion(q)}
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Question Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); resetQuestionForm() }}
        title="Create New Question"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input
            label="Question"
            placeholder="Enter your question"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Options (mark correct answer)
            </label>
            {options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctOption === index}
                  onChange={() => setCorrectOption(index)}
                  style={{ width: '20px', height: '20px' }}
                />
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            ))}
            {options.length < 6 && (
              <button
                onClick={handleAddOption}
                style={{
                  background: 'none',
                  border: '1px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + Add Option
              </button>
            )}
          </div>
          
          <Input
            label="Timer (seconds)"
            type="number"
            value={timer}
            onChange={(e) => setTimer(Number(e.target.value))}
            min={5}
            max={300}
          />
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => { setShowQuestionModal(false); resetQuestionForm() }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateQuestion}>
              Create Question
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RoomDetailPage