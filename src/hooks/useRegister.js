import React from 'react';
import api from '../lib/axios';

const INITIAL = {
  fullName: '',
  employeeId: '',
  cnic: '',
  email: '',
  department: '',
  joiningDate: '',
  password: '',
  branch: '',
  city: '',
  avatar: null, // File object
};

/**
 * useRegister
 * @param {{ onSuccess?: (data:any)=>void, onError?: (message:string)=>void }} opts
 */
export default function useRegister(opts = {}) {
  const { onSuccess, onError } = opts;
  const [form, setForm] = React.useState(INITIAL);
  const [loading, setLoading] = React.useState(false);

  function update(e) {
    const { name, value, files } = e.target || {};
    if (files) {
      // file inputs
      setForm((s) => ({ ...s, [name]: files[0] || null }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  }

  function reset() {
    setForm(INITIAL);
  }

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      // build multipart/form-data
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          fd.append(k, v);
        }
      });
      // avatar file must be under "avatar" because multer expects .single("avatar")
      if (form.avatar) fd.set('avatar', form.avatar);

      const { data } = await api.post('/api/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess?.(data);
      reset();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  return { form, update, submit, loading, reset, setForm };
}
