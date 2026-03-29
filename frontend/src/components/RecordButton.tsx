interface Props {
    recording: boolean
    loading: boolean
    onStart: () => void
    onStop: () => void
}

export default function RecordButton({ recording, loading, onStart, onStop }: Props) {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                {/* Pulse ring when recording */}
                {recording && (
                    <>
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-10 scale-110" />
                    </>
                )}

                <button
                    onClick={recording ? onStop : onStart}
                    disabled={loading}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
            ${recording
                            ? 'bg-red-500 hover:bg-red-600 scale-105'
                            : loading
                                ? 'bg-gray-200 cursor-not-allowed shadow-none'
                                : 'bg-white hover:bg-gray-50 hover:scale-105 border-2 border-gray-100'
                        }`}
                >
                    {loading ? (
                        <svg className="animate-spin w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : recording ? (
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                    ) : (
                        <svg className="w-7 h-7 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" />
                            <path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Status text */}
            <div className="text-center">
                {recording ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-red-500">Recording — click to stop</span>
                    </div>
                ) : loading ? (
                    <span className="text-sm font-medium text-gray-400">Processing your question...</span>
                ) : (
                    <span className="text-sm font-medium text-gray-400">Click to ask a question</span>
                )}
            </div>
        </div>
    )
}