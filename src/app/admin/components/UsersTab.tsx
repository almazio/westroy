import { useState } from 'react';
import styles from '../page.module.css';
import { trackEvent } from '@/lib/analytics';
import type { UserData } from '../types';
import { formatDate } from '../types';

interface UserCreateForm {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'client' | 'producer' | 'admin';
}

interface UserEditForm {
    name: string;
    phone: string;
    role: 'client' | 'producer' | 'admin';
    password: string;
}

interface UsersTabProps {
    users: UserData[];
    setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
    currentUserId: string | null;
}

export function UsersTab({ users, setUsers, currentUserId }: UsersTabProps) {
    const [creatingUser, setCreatingUser] = useState(false);
    const [createUserForm, setCreateUserForm] = useState<UserCreateForm>({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'client',
    });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userForm, setUserForm] = useState<UserEditForm>({
        name: '',
        phone: '',
        role: 'client',
        password: '',
    });

    const createUser = async () => {
        setCreatingUser(true);
        try {
            if (!createUserForm.name.trim() || !createUserForm.email.trim() || !createUserForm.phone.trim() || !createUserForm.password.trim()) {
                throw new Error('Заполните имя, email, телефон и пароль');
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createUserForm),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const created: UserData = await res.json();
            setUsers((prev) => [created, ...prev]);
            trackEvent('admin_action', { action: 'user_create', user_id: created.id, role: created.role });
            setCreateUserForm({
                name: '',
                email: '',
                phone: '',
                password: '',
                role: 'client',
            });
        } catch (error) {
            console.error('Failed to create user:', error);
            alert(error instanceof Error ? error.message : 'Не удалось создать пользователя');
        } finally {
            setCreatingUser(false);
        }
    };

    const startUserEdit = (user: UserData) => {
        setEditingUserId(user.id);
        setUserForm({
            name: user.name,
            phone: user.phone,
            role: user.role,
            password: '',
        });
    };

    const saveUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const updated: UserData = await res.json();
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
            trackEvent('admin_action', { action: 'user_update', user_id: userId, role: updated.role });
            setEditingUserId(null);
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Не удалось обновить пользователя');
        }
    };

    const deleteUser = async (userId: string) => {
        if (!window.confirm('Удалить пользователя?')) return;
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            trackEvent('admin_action', { action: 'user_delete', user_id: userId });
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Не удалось удалить пользователя');
        }
    };

    return (
        <>
            <div className={styles.userCreateCard}>
                <h3>Создать аккаунт</h3>
                <div className={styles.userCreateGrid}>
                    <input className="input" placeholder="Имя" value={createUserForm.name} onChange={(e) => setCreateUserForm((p) => ({ ...p, name: e.target.value }))} />
                    <input className="input" placeholder="Email" value={createUserForm.email} onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))} />
                    <input className="input" placeholder="Телефон" value={createUserForm.phone} onChange={(e) => setCreateUserForm((p) => ({ ...p, phone: e.target.value }))} />
                    <input className="input" type="password" placeholder="Пароль" value={createUserForm.password} onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))} />
                    <select className="input" value={createUserForm.role} onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value as UserCreateForm['role'] }))}>
                        <option value="client">client</option>
                        <option value="producer">producer</option>
                        <option value="admin">admin</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => void createUser()} disabled={creatingUser}>
                        {creatingUser ? 'Создание...' : 'Создать'}
                    </button>
                </div>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Пользователь</th>
                        <th>Роль</th>
                        <th>Активность</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const isEditing = editingUserId === user.id;
                        const isSelf = user.id === currentUserId;

                        return (
                            <tr key={user.id}>
                                <td>
                                    {isEditing ? (
                                        <div className={styles.editFields}>
                                            <input className="input" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
                                            <input className="input" value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} />
                                            <input className="input" type="password" placeholder="Новый пароль (опц.)" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
                                        </div>
                                    ) : (
                                        <>
                                            <strong>{user.name}</strong>
                                            <div className="text-muted">{user.email}</div>
                                            <div className="text-muted">{user.phone}</div>
                                        </>
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <select className="input" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as UserEditForm['role'] }))}>
                                            <option value="client">client</option>
                                            <option value="producer">producer</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    ) : (
                                        <span className="badge badge-info">{user.role}</span>
                                    )}
                                </td>
                                <td>
                                    <div>Заявок: {user._count?.requests ?? 0}</div>
                                    <div className="text-muted">{user.company ? `Компания: ${user.company.name}` : 'Без компании'}</div>
                                </td>
                                <td>{formatDate(user.createdAt)}</td>
                                <td>
                                    <div className={styles.rowActions}>
                                        {isEditing ? (
                                            <>
                                                <button className="btn btn-primary btn-sm" onClick={() => void saveUser(user.id)}>Сохранить</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingUserId(null)}>Отмена</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-secondary btn-sm" onClick={() => startUserEdit(user)}>Изменить</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => void deleteUser(user.id)} disabled={isSelf}>
                                                    {isSelf ? 'Это вы' : 'Удалить'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </>
    );
}
