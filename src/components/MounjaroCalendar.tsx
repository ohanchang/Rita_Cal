import { useState, useMemo, useRef } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Syringe, Trash2 } from "lucide-react";
import { MounjaroRecord } from "@/lib/types";

interface MounjaroCalendarProps {
  records: MounjaroRecord[];
  onAddRecord: (date: string, dose: number) => void;
  onDeleteRecord: (id: string) => void;
  isLoading: boolean;
}

const DOSES = [2.5, 5.0, 7.5, 10.0, 12.5, 15.0];

export default function MounjaroCalendar({ records, onAddRecord, onDeleteRecord, isLoading }: MounjaroCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDoseModal, setShowDoseModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MounjaroRecord | null>(null);

  // Long press handling
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, record: MounjaroRecord | undefined, date: Date) => {
    // If no record, just standard click to add
    if (!record) return;
    
    // Start long press timer
    timerRef.current = setTimeout(() => {
      setRecordToDelete(record);
      timerRef.current = null;
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, record: MounjaroRecord | undefined, date: Date) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      // It was a short press. But we only show Dose modal if they want to override? 
      // Actually, if it has a record, maybe click shouldn't do anything or just allow overriding.
      // Let's say if they short press, they can still open the modal to change/add a new one, 
      // or we just prevent it if there's already one? Let's allow overriding (they might have typed wrong dose).
      setSelectedDate(date);
      setShowDoseModal(true);
    }
    // Prevent default to avoid iOS ghost clicks if using touch
    if (e.type === 'touchend' && e.cancelable) {
      e.preventDefault();
    }
  };

  const handleTouchMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDoseSelect = (dose: number) => {
    if (selectedDate) {
      onAddRecord(format(selectedDate, "yyyy-MM-dd"), dose);
    }
    setShowDoseModal(false);
  };

  return (
    <div className="card" style={{ marginBottom: "var(--spacing-md)", userSelect: "none", WebkitTouchCallout: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Syringe size={18} className="text-primary" />
          GLP-1 追蹤 (猛健樂)
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <button onClick={prevMonth} className="btn" style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border-color)" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, minWidth: "70px", textAlign: "center" }}>
            {format(currentMonth, "yyyy / MM")}
          </span>
          <button onClick={nextMonth} className="btn" style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border-color)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
        {["日", "一", "二", "三", "四", "五", "六"].map(day => (
          <div key={day} style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, paddingBottom: "4px" }}>
            {day}
          </div>
        ))}
        
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          // Assume one record per day max
          const record = records.find(r => r.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onMouseDown={(e) => handleTouchStart(e, record, day)}
              onMouseUp={(e) => handleTouchEnd(e, record, day)}
              onMouseLeave={handleTouchMove}
              onTouchStart={(e) => handleTouchStart(e, record, day)}
              onTouchEnd={(e) => handleTouchEnd(e, record, day)}
              onTouchMove={handleTouchMove}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: record ? "rgba(108, 99, 255, 0.1)" : "transparent",
                border: today ? "1px solid var(--color-primary)" : record ? "1px solid rgba(108, 99, 255, 0.3)" : "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                opacity: isCurrentMonth ? 1 : 0.3,
                cursor: isLoading ? "wait" : "pointer",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: today || record ? 700 : 500, color: record ? "var(--color-primary)" : "inherit" }}>
                {format(day, "d")}
              </span>
              {record && (
                <span style={{ fontSize: "0.6rem", color: "var(--color-primary)", fontWeight: 700, marginTop: "2px" }}>
                  {record.dose}mg
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Select Dose Modal */}
      {showDoseModal && selectedDate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={() => setShowDoseModal(false)}>
          <div style={{ background: "var(--bg-card)", width: "100%", padding: "var(--spacing-lg)", borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)" }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 var(--spacing-md)", textAlign: "center" }}>
              記錄 {format(selectedDate, "MM/dd")} 施打劑量
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)" }}>
              {DOSES.map(d => (
                <button
                  key={d}
                  className="btn"
                  style={{ background: "rgba(108, 99, 255, 0.1)", color: "var(--color-primary)", border: "1px solid rgba(108, 99, 255, 0.2)", padding: "12px 0" }}
                  onClick={() => handleDoseSelect(d)}
                >
                  {d}mg
                </button>
              ))}
            </div>
            <button className="btn" style={{ width: "100%", marginTop: "var(--spacing-md)", background: "var(--bg-secondary)" }} onClick={() => setShowDoseModal(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {recordToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--spacing-lg)" }} onClick={() => setRecordToDelete(null)}>
          <div className="card" style={{ width: "100%", maxWidth: "300px" }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 var(--spacing-sm)", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={18} />
              刪除紀錄
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "var(--spacing-md)" }}>
              確定要刪除 {recordToDelete.date} ({recordToDelete.dose}mg) 的紀錄嗎？
            </p>
            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <button className="btn" style={{ flex: 1, background: "var(--bg-secondary)" }} onClick={() => setRecordToDelete(null)}>
                取消
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: "var(--color-danger)", color: "white" }}
                onClick={() => {
                  onDeleteRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
