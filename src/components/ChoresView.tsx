import React, { useState } from 'react';
import { Trash2, CheckCircle2, Coins, User, Trophy, TrendingUp, Lock, Unlock, Plus } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, parseISO } from 'date-fns';
import { useAdminGate } from '../lib/admin';
import { useChoresStore, useMembersStore, useRewardsStore, nextMemberColor } from '../lib/db';
import type { Recurrence } from '../types';

const ChoresView: React.FC = () => {
  const chores = useChoresStore((s) => s.items);
  const addChore = useChoresStore((s) => s.add);
  const updateChore = useChoresStore((s) => s.update);
  const removeChore = useChoresStore((s) => s.remove);

  const members = useMembersStore((s) => s.items);
  const addMember = useMembersStore((s) => s.add);
  const removeMember = useMembersStore((s) => s.remove);
  const adjustPoints = useMembersStore((s) => s.adjustPoints);

  const rewards = useRewardsStore((s) => s.items);
  const updateReward = useRewardsStore((s) => s.update);

  const admin = useAdminGate();

  const [newTask, setNewTask] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string>(members[0]?.id ?? '');
  const [taskPoints, setTaskPoints] = useState('15');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState<Recurrence>('none');
  const [newMemberName, setNewMemberName] = useState('');

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  const currentWeekString = `${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d')}`;
  const nextWeekString = `${format(nextWeekStart, 'MMM d')} - ${format(nextWeekEnd, 'MMM d')}`;

  const thisWeekTasks = chores.filter((t) => {
    if (!t.due_date) return true;
    return parseISO(t.due_date) <= currentWeekEnd;
  });
  const nextWeekTasks = chores.filter((t) => {
    if (!t.due_date) return false;
    return parseISO(t.due_date) > currentWeekEnd;
  });

  const memberById = new Map(members.map((m) => [m.id, m]));

  const handleAddTask = async () => {
    if (!newTask) return;
    await addChore({
      text: newTask,
      completed: false,
      assigned_to_member_id: taskAssignee || null,
      points: parseInt(taskPoints, 10) || 10,
      due_date: taskDueDate || null,
      recurrence: taskRecurrence,
    });
    setNewTask('');
    setTaskDueDate('');
    setTaskRecurrence('none');
  };

  const handleToggleChore = async (id: string) => {
    const chore = chores.find((c) => c.id === id);
    if (!chore) return;
    const nowCompleted = !chore.completed;
    await updateChore(id, { completed: nowCompleted });
    if (chore.assigned_to_member_id) {
      await adjustPoints(chore.assigned_to_member_id, nowCompleted ? chore.points : -chore.points);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    await addMember({
      name: newMemberName.trim(),
      points: 0,
      avatar_color: nextMemberColor(members),
    });
    setNewMemberName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full relative">
      <div className="lg:col-span-8 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold flex items-center gap-4">
            Family Chore Chart
            <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold uppercase tracking-widest hidden sm:block">
              Earn Points
            </span>
          </h2>
          <button
            onClick={admin.requestToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${admin.isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {admin.isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
            {admin.isAdmin ? 'Admin Mode' : 'Admin'}
          </button>
        </div>

        {admin.showPrompt && (
          <div className="absolute top-16 right-0 z-20 glass p-4 rounded-2xl shadow-2xl border border-white/20 w-72">
            <form onSubmit={admin.submit} className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-300">Enter Admin Password:</p>
              <input
                type="password"
                value={admin.passwordInput}
                onChange={(e) => admin.setPasswordInput(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 text-sm mt-1">
                <button type="button" onClick={admin.cancel} className="px-3 py-1.5 hover:bg-white/10 rounded-md">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-white font-medium">
                  Unlock
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="glass rounded-3xl p-6 flex flex-col gap-4 mb-8 shadow-xl border-white/10">
          <div className="flex gap-4">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="flex-1 bg-white/5 rounded-2xl p-5 outline-none border border-white/5 focus:border-blue-500 transition-all text-xl"
              placeholder="What needs to be done?"
            />
            <button
              onClick={handleAddTask}
              className="bg-blue-600 px-10 rounded-2xl hover:bg-blue-500 transition-transform active:scale-95 shrink-0 flex items-center justify-center shadow-lg shadow-blue-900/20 font-bold"
            >
              Assign
            </button>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[150px] relative">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block ml-1">Assignee</label>
              <div className="relative">
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-neutral-900 rounded-2xl p-4 pl-12 outline-none border border-white/5 text-gray-300 appearance-none focus:border-blue-500/50"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div className="w-48 relative">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block ml-1">Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-neutral-900 rounded-2xl p-4 outline-none border border-white/5 text-gray-300 focus:border-blue-500/50"
              />
            </div>
            <div className="w-40 relative">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block ml-1">Recurrence</label>
              <select
                value={taskRecurrence}
                onChange={(e) => setTaskRecurrence(e.target.value as Recurrence)}
                className="w-full bg-neutral-900 rounded-2xl p-4 outline-none border border-white/5 text-gray-300 appearance-none focus:border-blue-500/50"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="w-32 shrink-0">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block ml-1">Reward</label>
              <div className="relative">
                <input
                  type="number"
                  value={taskPoints}
                  onChange={(e) => setTaskPoints(e.target.value)}
                  className="w-full bg-neutral-900 rounded-2xl p-4 pl-12 outline-none border border-white/5 text-gray-300 focus:border-yellow-500/50"
                />
                <Coins size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600">PTS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 pr-4">
          <ChoreSection
            title="This Week"
            range={currentWeekString}
            tasks={thisWeekTasks}
            members={memberById}
            isAdmin={admin.isAdmin}
            onToggle={handleToggleChore}
            onUpdatePoints={(id, points) => updateChore(id, { points })}
            onRemove={(id) => removeChore(id)}
            empty="No chores for this week."
          />
          <ChoreSection
            title="Upcoming"
            range={`${nextWeekString} & beyond`}
            tasks={nextWeekTasks}
            members={memberById}
            isAdmin={admin.isAdmin}
            onToggle={handleToggleChore}
            onUpdatePoints={(id, points) => updateChore(id, { points })}
            onRemove={(id) => removeChore(id)}
            empty="No upcoming chores."
            dim
          />
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="glass rounded-3xl p-8 shadow-2xl border-white/5 sticky top-0 max-h-full overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-green-500" />
            <h3 className="text-2xl font-bold">Hall of Fame</h3>
          </div>

          <div className="space-y-6">
            {sortedMembers.map((member, idx) => (
              <div key={member.id} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl ${member.avatar_color} flex items-center justify-center font-bold text-xl shadow-lg`}>
                        {member.name[0]}
                      </div>
                      {idx === 0 && <div className="absolute -top-3 -right-3 rotate-12 text-2xl">👑</div>}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{member.name}</p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        Level {Math.floor(member.points / 100) + 1}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{member.points}</span>
                      <span className="text-[10px] block text-yellow-500 font-bold uppercase tracking-widest">Points</span>
                    </div>
                    {admin.isAdmin && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg ml-2"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full ${member.avatar_color} transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                    style={{ width: `${member.points % 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {sortedMembers.length === 0 && (
              <p className="text-gray-500 italic text-sm">Add your first family member below.</p>
            )}
          </div>

          {admin.isAdmin && (
            <div className="mt-8 flex gap-2">
              <input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                placeholder="Add family member…"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddMember}
                className="bg-blue-600 hover:bg-blue-500 px-3 rounded-xl text-white flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-yellow-500" size={20} />
              <h4 className="font-bold text-white text-lg tracking-wide">Weekly Rewards</h4>
            </div>

            <div className="space-y-3">
              {rewards.map((reward, index) => {
                const colors = [
                  'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
                  'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
                  'from-yellow-500/10 to-orange-500/5 border-yellow-500/20 text-yellow-400',
                ];
                const colorClass = colors[index % colors.length];
                const [gradient1, gradient2, border, accent] = colorClass.split(' ');

                return (
                  <div key={reward.id} className={`p-4 bg-gradient-to-br ${gradient1} ${gradient2} rounded-2xl border ${border}`}>
                    {admin.isAdmin ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase ${accent}`}>Tier {index + 1} Points:</span>
                          <input
                            type="number"
                            value={reward.points}
                            onChange={(e) => updateReward(reward.id, { points: parseInt(e.target.value, 10) || 0 })}
                            className="bg-black/50 border border-white/10 rounded px-2 py-1 w-20 text-white outline-none focus:border-blue-500 text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          value={reward.description}
                          onChange={(e) => updateReward(reward.id, { description: e.target.value })}
                          className="bg-black/50 border border-white/10 rounded px-2 py-1 w-full text-white outline-none focus:border-blue-500 font-medium"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className={`font-bold text-sm mb-1 uppercase tracking-widest ${accent}`}>
                          {reward.points} PTS • Tier {index + 1}
                        </h4>
                        <p className="text-white font-medium text-lg leading-snug">{reward.description}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChoreSectionProps {
  title: string;
  range: string;
  tasks: ReturnType<typeof useChoresStore.getState>['items'];
  members: Map<string, ReturnType<typeof useMembersStore.getState>['items'][number]>;
  isAdmin: boolean;
  onToggle: (id: string) => void;
  onUpdatePoints: (id: string, points: number) => void;
  onRemove: (id: string) => void;
  empty: string;
  dim?: boolean;
}

const ChoreSection: React.FC<ChoreSectionProps> = ({
  title,
  range,
  tasks,
  members,
  isAdmin,
  onToggle,
  onUpdatePoints,
  onRemove,
  empty,
  dim,
}) => (
  <div>
    <div className={`flex items-center justify-between mb-4 ${dim ? 'mt-8' : ''}`}>
      <h3 className={`text-xl font-bold flex items-center gap-2 ${dim ? 'text-gray-400 opacity-80' : ''}`}>
        {title}
        <span className={`text-xs px-2 py-1 rounded font-normal ${dim ? 'bg-white/5 text-gray-500' : 'bg-white/10 text-gray-400'}`}>
          {range}
        </span>
      </h3>
    </div>
    <div className={`space-y-4 ${dim ? 'opacity-80' : ''}`}>
      {tasks.length > 0 ? (
        tasks.map((task) => {
          const member = task.assigned_to_member_id ? members.get(task.assigned_to_member_id) : undefined;
          return (
            <div
              key={task.id}
              className={`w-full flex items-center justify-between gap-4 p-6 rounded-3xl transition-all border group relative ${
                task.completed ? 'bg-white/5 border-transparent opacity-60' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <button onClick={() => onToggle(task.id)} className="flex items-center gap-6 text-left flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                    task.completed ? 'bg-blue-500 border-blue-500 scale-90' : 'border-gray-700 group-hover:border-blue-500'
                  }`}
                >
                  {task.completed && <CheckCircle2 size={24} className="text-white" />}
                </div>
                <div>
                  <span className={`text-2xl font-semibold block ${task.completed ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                    {task.text}
                  </span>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full ${member?.avatar_color ?? 'bg-gray-500'} flex items-center justify-center text-[8px] font-bold`}>
                        {member?.name[0] ?? '?'}
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {member?.name ?? 'Unassigned'}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded">
                        Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {task.recurrence && task.recurrence !== 'none' && (
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">
                        {task.recurrence}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3">
                {isAdmin && !task.completed ? (
                  <input
                    type="number"
                    value={task.points || 0}
                    onChange={(e) => onUpdatePoints(task.id, parseInt(e.target.value, 10) || 0)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 w-20 text-center text-yellow-500 font-bold outline-none focus:border-yellow-500"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-sm bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/10">
                    <Coins size={14} />
                    {task.points} Points
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => onRemove(task.id)}
                    className="p-3 text-red-400 hover:bg-red-500/20 transition-all rounded-xl ml-2"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500 italic p-4 bg-white/5 rounded-2xl text-center">{empty}</p>
      )}
    </div>
  </div>
);

export default ChoresView;
