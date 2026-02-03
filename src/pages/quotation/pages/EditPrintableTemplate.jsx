import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

function EditPrintableTemplate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    header_image: '',
    company_address: '',
    company_phone: '',
    company_email: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('company_header')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTemplate(data);
        setImagePreview(data.header_image || '');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setTemplate({ ...template, header_image: '' });
  };

  const uploadImage = async () => {
    if (!imageFile) return template.header_image;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `header-${Date.now()}.${fileExt}`;
      const filePath = `quotation-headers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quotations')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('quotations')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let headerImageUrl = template.header_image;

      if (imageFile) {
        headerImageUrl = await uploadImage();
      }

      const templateData = {
        ...template,
        header_image: headerImageUrl
      };

      const { error } = await supabase
        .from('company_header')
        .upsert(templateData, { onConflict: 'id' });

      if (error) throw error;

      alert('Template saved successfully!');
      navigate('/quotation');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 flex items-center justify-center" style={{ marginLeft: '16rem' }}>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Edit Printable Template" 
          subtitle="Customize your quotation header"
        />

        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
              {/* Info Banner */}
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Header Layout</h3>
                <p className="text-sm text-blue-700">
                  The header will be displayed centered at the top of all quotations with your logo,
                  address, and contact information.
                </p>
              </div>

              {/* Header Image Section */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Upload your company logo to display at the center of the header
                </p>

                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Logo Preview"
                      className="w-full h-48 object-contain border-2 border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="header-image" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-blue-600 hover:text-blue-500">
                          Upload a logo
                        </span>
                        <input
                          id="header-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Company Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <p className="text-sm text-gray-500 mb-4">
                  This information will appear centered below the logo in the header
                </p>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Address
                    </label>
                    <textarea
                      value={template.company_address}
                      onChange={(e) => setTemplate({ ...template, company_address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full company address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={template.company_phone}
                        onChange={(e) => setTemplate({ ...template, company_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+63 XXX XXX XXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="text"
                        value={template.company_email}
                        onChange={(e) => setTemplate({ ...template, company_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="info@company.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Header Preview</h3>
                <div className="bg-white p-6 rounded border border-gray-300">
                  <div className="text-center pb-4" style={{ borderBottom: '1pt solid black' }}>
                    {imagePreview && (
                      <div className="mb-3">
                        <img 
                          src={imagePreview} 
                          alt="Logo Preview" 
                          className="h-20 object-contain mx-auto"
                        />
                      </div>
                    )}
                    {template.company_address && (
                      <p className="text-sm text-black mb-1">{template.company_address}</p>
                    )}
                    <div className="text-sm text-black">
                      {template.company_phone && <span>{template.company_phone}</span>}
                      {template.company_phone && template.company_email && <span className="mx-2">|</span>}
                      {template.company_email && <span>{template.company_email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/quotation')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPrintableTemplate;