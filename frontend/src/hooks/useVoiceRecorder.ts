import { useState, useRef } from 'react'

export function useVoiceRecorder() {
    const [recording, setRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        mediaRecorder.start()
        setRecording(true)
    }

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current
            if (!mediaRecorder) return

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                resolve(blob)
            }

            mediaRecorder.stop()
            mediaRecorder.stream.getTracks().forEach(t => t.stop())
            setRecording(false)
        })
    }

    return { recording, startRecording, stopRecording }
}