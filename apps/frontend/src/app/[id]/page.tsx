'use client'

import { Progress } from '@/components/ui/progress';
import { redirect, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Page() {
    const { id } = useParams();
    const [data, setData] = useState<any>();

    useEffect(() => {
        const raw = localStorage.getItem("results")

        if (!raw) {
            redirect("/")
        }
        const json = JSON.parse(raw);
        const find = json.find((x) => x.id === id);

        if (!find) {
            redirect("/")
        }

        setData(find);
    }, [])

    if (!data) return <>loading data</>


    return (
        <div>
            <h3 className="text-4xl font-semibold">Case analysis #{data.id}</h3>

            <div className='mt-10'>
                <h3 className="text-4xl font-semibold">Fingerprint match</h3>
                <img src={`data:image/png;base64,${data.suspects.image}`} className='mt-10' />
            </div>



            <div className="mt-10">
                <h3 className="text-4xl font-semibold">AI Case breakdown</h3>
            </div>

            <div className="mt-10">
                <h3 className="text-4xl font-semibold">Fingerprint data</h3>
                <div className='mt-10'>
                    {data.suspects.people.sort((a, b) => b.confidence - a.confidence).map((people) => (
                        <div className='flex flex-col gap-4 border-y py-5' key={people.name}>
                            <span>{people.name}</span>
                            <Progress value={people.confidence * 100} />
                            <span>
                                Score: {people.score}
                            </span>
                        </div>
                    ))}
                </div>
            </div>



            <div className='mt-10'>
                <h3 className="text-4xl font-semibold">DNA data</h3>
                <div className="mt-10">
                    {data.dna.sort((a, b) => b.best_alignment_score - a.best_alignment_score).map((d) => (
                        <div className='flex flex-col gap-4 border-y py-5' key={d.suspect_id}>
                            <p className='font-semibold'>{d.suspect_id}</p>
                            <span>DNA Sequence Matches: {d.best_alignment_score}</span>

                            <Progress value={d.confidence * 100} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
