"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: "",
    lastname: "",
    role: "user",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const response = await fetch("/api/users");
    const data: User[] = await response.json();
    setUsers(data);
  };

  const generateUserName = (name: string, lastname: string): string => {
    return `${name.toLowerCase()}.${lastname.toLowerCase()}`;
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.lastname || !newUser.password) {
      alert("All fields are required!");
      return;
    }

    const userName = generateUserName(newUser.name, newUser.lastname);

    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newUser, userName }),
    });

    setNewUser({ name: "", lastname: "", role: "user", password: "" });
    fetchUsers();
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setEditData({ ...user });
  };

  const handleSaveClick = async () => {
    if (!editingUserId) return;

    await fetch(`/api/users/${editingUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });

    setEditingUserId(null);
    fetchUsers();
  };

  return (
    <div>
      <h1>👥 User Management</h1>

      {/* Add User Form */}
      <div className="add-user-form">
        <input
          type="text"
          placeholder="First Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Last Name"
          value={newUser.lastname}
          onChange={(e) =>
            setNewUser({ ...newUser, lastname: e.target.value })
          }
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) =>
            setNewUser({ ...newUser, password: e.target.value })
          }
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={handleAddUser}>➕ Add User</button>
      </div>

      {/* Users Table */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Last Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                {editingUserId === user.id ? (
                  <input
                    type="text"
                    value={editData.name || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                ) : (
                  user.name
                )}
              </td>
              <td>
                {editingUserId === user.id ? (
                  <input
                    type="text"
                    value={editData.lastname || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, lastname: e.target.value })
                    }
                  />
                ) : (
                  user.lastname
                )}
              </td>
              <td>{user.userName}</td>
              <td>
                {editingUserId === user.id ? (
                  <select
                    value={editData.role || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, role: e.target.value })
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  user.role
                )}
              </td>
              <td>
                {editingUserId === user.id ? (
                  <button onClick={handleSaveClick}>💾 Save</button>
                ) : (
                  <button onClick={() => handleEditClick(user)}>✏️ Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
