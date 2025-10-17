import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- TYPE DEFINITIONS ---
type AttendanceStatus = 'present' | 'absent' | 'holiday' | 'extra';
interface Student {
  id: string;
  name: string;
  created_at: string;
}
interface AttendanceRecord {
  status: AttendanceStatus;
  comment: string;
}
// This represents the data structure for a single day in the calendar
interface CalendarDayData extends AttendanceRecord {
    student_id: string;
    date: string;
}
// This is the main state structure for attendance, mapping date strings to records
interface AttendanceData {
  [date: string]: AttendanceRecord;
}


// --- CONSTANTS ---
const TUTOR_SECRET_CODE = 'Tutor2042!'; // Updated for security
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Refined Color Palette
const STATUS_COLORS: { [key in AttendanceStatus]: { bg: string; text: string; border: string; darkBg: string; } } = {
  present: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-500', darkBg: 'bg-emerald-500' },
  absent: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-500', darkBg: 'bg-rose-500' },
  holiday: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-500', darkBg: 'bg-sky-500' },
  extra: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500', darkBg: 'bg-purple-500' },
};
const STATUS_OPTIONS: { id: AttendanceStatus; label: string }[] = [
    { id: 'present', label: 'Present' },
    { id: 'absent', label: 'Absent' },
    { id: 'holiday', label: 'Holiday' },
    { id: 'extra', label: 'Extra/Compensation' },
];

// --- HELPER ICONS (No changes) ---
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>;

// --- SUPABASE CLIENT ---
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- DATA HOOK ---
function useSupabaseData() {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    return { students, setStudents, isLoaded, fetchStudents };
}

// --- COMPONENTS ---

// Supabase Setup Screen
const SupabaseSetup: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                 <h1 className="text-3xl font-bold text-slate-800">Welcome to Tutor Connect</h1>
                 <p className="text-lg text-slate-600 mt-2 mb-6">Cloud Storage Configuration Needed</p>
                 <div className="text-left bg-slate-50 p-6 rounded-lg border">
                    <p className="font-semibold text-slate-700 mb-4">To get started, you need to connect the app to a free Supabase database:</p>
                    <ol className="list-decimal list-inside space-y-3 text-slate-600">
                        <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">supabase.com</a> and create a new project.</li>
                        <li>In your Supabase project, go to the "SQL Editor" and run the following commands to create your tables:
                            <pre className="text-xs bg-slate-200 text-slate-800 p-3 rounded-md mt-2 overflow-x-auto">
{`-- Create the students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);`}
                            </pre>
                        </li>
                        <li>Go to "Project Settings" {'>'} "API".</li>
                        <li>Find your <b className="text-slate-700">Project URL</b> and <b className="text-slate-700">anon public API Key</b>.</li>
                        <li>In your Netlify project, go to "Site configuration" {'>'} "Environment variables" and add them as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.</li>
                        <li>Redeploy your Netlify site. The app will connect automatically.</li>
                    </ol>
                 </div>
            </div>
        </div>
    );
};


// Login Screen (No major changes)
const LoginScreen: React.FC<{ onLogin: (role: 'tutor' | 'parent', user?: Student) => void; students: Student[] }> = ({ onLogin, students }) => {
    const [tutorCode, setTutorCode] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [error, setError] = useState('');

    const handleTutorLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (tutorCode === TUTOR_SECRET_CODE) {
            onLogin('tutor');
        } else {
            setError('Invalid secret code.');
        }
    };

    const handleParentLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id === selectedStudent);
        if (student) {
            onLogin('parent', student);
        } else {
            setError('Please select a student.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-slate-800">Tutor Connect</h1>
                    <p className="text-lg text-slate-600 mt-2">Chaitra's personal Attendance Tracker</p>
                </header>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Tutor Login</h2>
                        <form onSubmit={handleTutorLogin}>
                            <input
                                type="password"
                                placeholder="Enter Secret Code"
                                value={tutorCode}
                                onChange={(e) => { setTutorCode(e.target.value); setError(''); }}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Tutor Secret Code"
                            />
                            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300">
                                Login as Tutor
                            </button>
                        </form>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Parent/Student Login</h2>
                        <form onSubmit={handleParentLogin}>
                            <select
                                value={selectedStudent}
                                onChange={(e) => { setSelectedStudent(e.target.value); setError(''); }}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                aria-label="Select Student"
                            >
                                <option value="" disabled>Select a student...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button type="submit" className="w-full mt-4 bg-slate-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-800 transition duration-300">
                                View Attendance
                            </button>
                        </form>
                    </div>
                </div>
                 {error && <p className="text-red-500 text-center mt-6 font-semibold">{error}</p>}
            </div>
        </div>
    );
};

// Calendar Component
const Calendar: React.FC<{
    currentDate: Date;
    attendance: AttendanceData;
    onDayClick: (day: number) => void;
    isTutor: boolean;
    isLoading: boolean;
}> = ({ currentDate, attendance, onDayClick, isTutor, isLoading }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarGrid = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ key: `blank-${i}`, type: 'blank' });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = attendance[dateStr];
            days.push({ key: dateStr, type: 'day', day, record });
        }
        return days;
    }, [year, month, attendance]);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            )}
            <div className="grid grid-cols-7 gap-2 text-center font-semibold text-slate-600 mb-4">
                {weekdays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {calendarGrid.map(item => {
                    if (item.type === 'blank') return <div key={item.key}></div>;
                    
                    const { day, record } = item;
                    const colors = record ? STATUS_COLORS[record.status] : null;
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    
                    return (
                        <div
                            key={item.key}
                            onClick={() => isTutor && onDayClick(day)}
                            className={`
                                aspect-square p-2 rounded-lg flex flex-col justify-between transition-transform duration-150
                                ${isTutor ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}
                                ${colors ? colors.bg : 'bg-white'}
                            `}
                        >
                            <span className={`
                                font-bold text-lg ${colors ? colors.text : 'text-slate-700'}
                                ${isToday ? 'bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center' : ''}
                            `}>
                                {day}
                            </span>
                             {record && (
                                <div className="text-left mt-1 overflow-hidden">
                                    <p className={`text-xs font-semibold uppercase ${colors?.text} tracking-wider`}>
                                        {record.status}
                                    </p>
                                    <p className={`text-xs ${colors?.text} truncate`}>{record.comment}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Attendance Modal
const AttendanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: AttendanceRecord) => void;
    currentRecord?: AttendanceRecord;
    selectedDate: Date | null;
}> = ({ isOpen, onClose, onSave, currentRecord, selectedDate }) => {
    const [status, setStatus] = useState<AttendanceStatus>('present');
    const [comment, setComment] = useState('');
    const firstRender = useRef(true);

    useEffect(() => {
        if (isOpen) {
            setStatus(currentRecord?.status || 'present');
            setComment(currentRecord?.comment || '');
            firstRender.current = false;
        }
    }, [isOpen, currentRecord]);

    const handleSave = () => {
        onSave({ status, comment });
    };

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md p-8 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Update Attendance</h2>
                <p className="text-slate-600 mb-6">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="space-y-3 mb-6">
                    <p className="font-semibold text-slate-700">Status</p>
                    <div className="grid grid-cols-2 gap-3">
                        {STATUS_OPTIONS.map(({id, label}) => (
                           <button
                                key={id}
                                onClick={() => setStatus(id)}
                                className={`p-3 rounded-lg text-sm font-semibold transition ${status === id ? `${STATUS_COLORS[id].darkBg} text-white` : 'bg-slate-100 hover:bg-slate-200'}`}
                           >
                               {label}
                           </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="comment" className="block font-semibold text-slate-700 mb-2">Comment</label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="e.g., Covered Chapter 5"
                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28"
                    />
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 font-semibold transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition">Save</button>
                </div>
            </div>
        </div>
    );
};

// Student Manager Modal
const StudentManager: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    onStudentAdded: () => void;
    onStudentDeleted: () => void;
}> = ({ isOpen, onClose, students, onStudentAdded, onStudentDeleted }) => {
    const [newName, setNewName] = useState('');

    if (!isOpen) return null;

    const addStudent = async () => {
        if (newName.trim() && supabase) {
            const { error } = await supabase.from('students').insert({ name: newName.trim() });
            if (error) {
                console.error("Error adding student:", error);
            } else {
                setNewName('');
                onStudentAdded();
            }
        }
    };
    
    const deleteStudent = async (id: string) => {
        if (window.confirm("Are you sure? All attendance data for this student will be deleted.") && supabase) {
            const { error } = await supabase.from('students').delete().eq('id', id);
             if (error) {
                console.error("Error deleting student:", error);
            } else {
                onStudentDeleted();
            }
        }
    };

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Manage Students</h2>
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="New student name"
                        className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={addStudent} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition">Add</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-3">
                    {students.map(student => (
                        <div key={student.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <span className="font-medium text-slate-800">{student.name}</span>
                            <button onClick={() => deleteStudent(student.id)} className="text-red-500 hover:text-red-700">
                                <DeleteIcon />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-8">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 font-semibold transition">Done</button>
                </div>
            </div>
        </div>
    );
};


// Dashboard Component
const Dashboard: React.FC<{
    user: Student | 'tutor';
    onLogout: () => void;
    students: Student[];
    fetchStudents: () => void;
}> = ({ user, onLogout, students, fetchStudents }) => {
    const isTutor = user === 'tutor';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedStudentId, setSelectedStudentId] = useState(isTutor && students.length > 0 ? students[0].id : (user as Student).id);
    const [attendance, setAttendance] = useState<AttendanceData>({});
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentManagerOpen, setIsStudentManagerOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const fetchAttendanceForMonth = useCallback(async (studentId: string, date: Date) => {
        if (!supabase || !studentId) return;
        setIsLoadingAttendance(true);
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const lastDayOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', studentId)
                .gte('date', firstDay)
                .lte('date', lastDayOfMonth);

            if (error) throw error;
            
            const newAttendanceData: AttendanceData = {};
            for (const record of data) {
                newAttendanceData[record.date] = { status: record.status, comment: record.comment };
            }
            setAttendance(newAttendanceData);
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setIsLoadingAttendance(false);
        }
    }, []);
    
    useEffect(() => {
        if (selectedStudentId) {
            fetchAttendanceForMonth(selectedStudentId, currentDate);
        } else {
             setAttendance({});
             setIsLoadingAttendance(false);
        }
    }, [selectedStudentId, currentDate, fetchAttendanceForMonth]);

    useEffect(() => {
        if (isTutor && students.length > 0 && !students.find(s => s.id === selectedStudentId)) {
            setSelectedStudentId(students[0].id);
        }
    }, [students, selectedStudentId, isTutor]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta, 1); // Set to day 1 to avoid month-end issues
            return newDate;
        });
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setIsModalOpen(true);
    };

    const handleSaveAttendance = async (record: AttendanceRecord) => {
        if (selectedDay && supabase) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
            const { error } = await supabase.from('attendance').upsert({
                student_id: selectedStudentId,
                date: dateStr,
                status: record.status,
                comment: record.comment
            }, { onConflict: 'student_id,date' });

            if (error) {
                console.error("Error saving attendance:", error);
            } else {
                setAttendance(prev => ({...prev, [dateStr]: record }));
            }
            setIsModalOpen(false);
            setSelectedDay(null);
        }
    };
    
    const selectedStudentName = useMemo(() => {
        if (isTutor) {
             return students.find(s => s.id === selectedStudentId)?.name || 'No students';
        }
        return (user as Student).name;
    }, [isTutor, user, students, selectedStudentId]);

    const selectedDateForModal = useMemo(() => {
        if (!selectedDay) return null;
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    }, [currentDate, selectedDay]);

    const currentRecordForModal = useMemo(() => {
        if (!selectedDay || !selectedStudentId) return undefined;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        return attendance[dateStr];
    }, [attendance, currentDate, selectedDay, selectedStudentId]);

    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Tutor Connect</h1>
                        <p className="text-slate-600">
                            Viewing as: <span className="font-semibold">{isTutor ? 'Tutor' : 'Parent'}</span>
                        </p>
                    </div>
                    <button onClick={onLogout} className="mt-4 sm:mt-0 px-5 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 font-semibold transition">Logout</button>
                </header>

                <main>
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                           <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-200 transition"><ChevronLeftIcon /></button>
                           <h2 className="text-xl font-bold text-slate-800 text-center w-48">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                           <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-200 transition"><ChevronRightIcon /></button>
                        </div>
                        <div className="flex items-center gap-4">
                            {isTutor && (
                                <>
                                 <button onClick={() => setIsStudentManagerOpen(true)} className="flex items-center px-4 py-2 rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-semibold transition">
                                     <UserGroupIcon/> Manage Students
                                 </button>
                                 <select 
                                     value={selectedStudentId} 
                                     onChange={e => setSelectedStudentId(e.target.value)}
                                     className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                     aria-label="Select student to view"
                                 >
                                     {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                 </select>
                                </>
                            )}
                            {!isTutor && <p className="text-lg font-semibold text-slate-800">Student: {selectedStudentName}</p>}
                        </div>
                    </div>
                    
                    {(isTutor && students.length === 0) ? (
                        <div className="text-center bg-white p-10 rounded-xl shadow-lg border border-gray-200">
                            <h3 className="text-xl font-semibold text-slate-700">No students found.</h3>
                            <p className="text-slate-500 mt-2">Click 'Manage Students' to add your first student.</p>
                        </div>
                    ) : (
                        <Calendar 
                            currentDate={currentDate} 
                            attendance={attendance} 
                            onDayClick={isTutor ? handleDayClick : () => {}}
                            isTutor={isTutor}
                            isLoading={isLoadingAttendance}
                        />
                    )}
                </main>
            </div>
            {isTutor && (
                <>
                    <AttendanceModal 
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveAttendance}
                        currentRecord={currentRecordForModal}
                        selectedDate={selectedDateForModal}
                    />
                    <StudentManager 
                        isOpen={isStudentManagerOpen}
                        onClose={() => setIsStudentManagerOpen(false)}
                        students={students}
                        onStudentAdded={fetchStudents}
                        onStudentDeleted={fetchStudents}
                    />
                </>
            )}
        </div>
    );
};

// Main App Component
const App: React.FC = () => {
    const { students, isLoaded, fetchStudents } = useSupabaseData();
    const [user, setUser] = useState<Student | 'tutor' | null>(null);

    if (!supabase) {
        return <SupabaseSetup />;
    }

    const handleLogin = (role: 'tutor' | 'parent', loggedInUser?: Student) => {
        if (role === 'tutor') {
            setUser('tutor');
        } else if (loggedInUser) {
            setUser(loggedInUser);
        }
    };

    const handleLogout = () => {
        setUser(null);
    };
    
    if (!isLoaded) {
        return <div className="min-h-screen flex items-center justify-center font-semibold text-slate-600">Connecting to database...</div>;
    }

    if (!user) {
        return <LoginScreen onLogin={handleLogin} students={students} />;
    }

    return (
        <Dashboard
            user={user}
            onLogout={handleLogout}
            students={students}
            fetchStudents={fetchStudents}
        />
    );
};

export default App;