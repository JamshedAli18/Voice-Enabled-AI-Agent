interface Props {
    transcript: string
}

export default function TranscriptBox({ transcript }: Props) {
    if (!transcript) return null

    return (
        <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">
                You asked
            </p>
            <p className="text-gray-800 text-sm leading-relaxed">{transcript}</p>
        </div>
    )
}